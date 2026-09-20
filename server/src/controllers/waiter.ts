import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { verifyTableSession } from '../services/session.js';
import { notifyWaiterRequested, notifyWaiterStatusUpdated } from '../services/realtime.js';

/**
 * Customer: Request Waiter Assistance at Table
 * Securely binds to the validated tableSessionToken.
 * Prevents spam if an active request already exists for the table.
 */
export async function requestWaiter(req: Request, res: Response): Promise<void> {
  try {
    const { tableSessionToken, reason, note, customerNote } = req.body;

    if (!tableSessionToken) {
      res.status(403).json({ error: 'Valid table session is required to call a waiter' });
      return;
    }

    const sessionData = verifyTableSession(tableSessionToken);
    if (!sessionData) {
      res.status(403).json({ error: 'Invalid or expired dining session. Please scan the table QR code again.' });
      return;
    }

    const { restaurantId, tableId } = sessionData;

    // Verify table is still active
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table || !table.isActive || table.restaurantId !== restaurantId) {
      res.status(403).json({ error: 'This dining table is currently inactive' });
      return;
    }

    // Anti-spam check: Is there already an unresolved request for this table?
    const existingActiveRequest = await prisma.waiterRequest.findFirst({
      where: {
        restaurantId,
        tableId,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingActiveRequest) {
      res.status(409).json({
        error: 'A waiter has already been notified for your table. Staff is on their way.',
        request: {
          id: existingActiveRequest.id,
          status: existingActiveRequest.status,
          reason: existingActiveRequest.reason,
          note: existingActiveRequest.note,
          tableNumber: table.tableNumber,
          createdAt: existingActiveRequest.createdAt,
        },
      });
      return;
    }

    // Determine reason and optional note
    const selectedReason = reason
      ? String(reason).trim().slice(0, 100)
      : 'Assistance Needed';
    const parsedNote = note
      ? String(note).trim().slice(0, 200)
      : customerNote
      ? String(customerNote).trim().slice(0, 200)
      : null;

    // Create new waiter request
    const newRequest = await prisma.waiterRequest.create({
      data: {
        restaurantId,
        tableId,
        status: 'PENDING',
        reason: selectedReason,
        note: parsedNote,
      },
      include: {
        table: { select: { tableNumber: true } },
      },
    });

    const requestPayload = {
      id: newRequest.id,
      restaurantId: newRequest.restaurantId,
      tableId: newRequest.tableId,
      tableNumber: newRequest.table.tableNumber,
      status: newRequest.status,
      reason: newRequest.reason,
      note: newRequest.note,
      createdAt: newRequest.createdAt,
      acknowledgedAt: newRequest.acknowledgedAt,
      completedAt: newRequest.completedAt,
    };

    // Emit live alert to staff via Socket.IO
    try {
      notifyWaiterRequested(restaurantId, requestPayload);
    } catch {
      // Non-critical if socket delivery fails
    }

    res.status(201).json({
      success: true,
      message: `Staff has been notified for Table ${table.tableNumber}. Someone is on their way!`,
      request: requestPayload,
    });
  } catch (error: any) {
    console.error('Request waiter error:', error);
    res.status(500).json({ error: 'Failed to notify waiter. Please alert staff directly.' });
  }
}

/**
 * Customer: Get active waiter request status for current table session
 */
export async function getWaiterStatus(req: Request, res: Response): Promise<void> {
  try {
    const tableSessionToken =
      (req.query.tableSessionToken as string) ||
      (req.query.sessionToken as string) ||
      (req.headers['x-table-session'] as string);

    if (!tableSessionToken) {
      res.json({ active: false, activeRequest: null, request: null });
      return;
    }

    const sessionData = verifyTableSession(tableSessionToken);
    if (!sessionData) {
      res.json({ active: false, activeRequest: null, request: null });
      return;
    }

    const activeRequest = await prisma.waiterRequest.findFirst({
      where: {
        restaurantId: sessionData.restaurantId,
        tableId: sessionData.tableId,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
      include: {
        table: { select: { tableNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeRequest) {
      res.json({ active: false, activeRequest: null, request: null });
      return;
    }

    const reqData = {
      id: activeRequest.id,
      tableNumber: activeRequest.table.tableNumber,
      status: activeRequest.status,
      reason: activeRequest.reason,
      note: activeRequest.note,
      createdAt: activeRequest.createdAt,
      acknowledgedAt: activeRequest.acknowledgedAt,
      completedAt: activeRequest.completedAt,
    };

    res.json({
      active: true,
      activeRequest: reqData,
      request: reqData,
    });
  } catch (error: any) {
    console.error('Get waiter status error:', error);
    res.status(500).json({ error: 'Failed to query waiter status' });
  }
}

/**
 * Admin: Get active & recent waiter requests for kitchen/floor dashboard
 */
export async function getAdminWaiterRequests(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = (req as any).user?.restaurantId;

    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const requests = await prisma.waiterRequest.findMany({
      where: {
        restaurantId,
        OR: [
          { status: { in: ['PENDING', 'ACKNOWLEDGED'] } },
          {
            status: { in: ['COMPLETED', 'CANCELLED'] },
            createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
        ],
      },
      include: {
        table: { select: { tableNumber: true } },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first, then ACKNOWLEDGED
        { createdAt: 'desc' },
      ],
      take: 20,
    });

    const formatted = requests.map((r: any) => ({
      id: r.id,
      tableNumber: r.table.tableNumber,
      tableId: r.tableId,
      status: r.status,
      reason: r.reason,
      note: r.note,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      acknowledgedAt: r.acknowledgedAt,
      completedAt: r.completedAt,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Admin get waiter requests error:', error);
    res.status(500).json({ error: 'Failed to fetch waiter requests' });
  }
}

/**
 * Admin: Update Waiter Request Status (ACKNOWLEDGED / COMPLETED / CANCELLED)
 */
export async function updateWaiterRequestStatus(req: Request, res: Response): Promise<void> {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    const id = String(req.params.id);
    const { status } = req.body;

    const validStatuses = ['ACKNOWLEDGED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const request = await prisma.waiterRequest.findFirst({
      where: { id, restaurantId },
      include: { table: { select: { tableNumber: true } } },
    });

    if (!request) {
      res.status(404).json({ error: 'Waiter request not found' });
      return;
    }

    const updateData: any = { status };
    if (status === 'ACKNOWLEDGED' && !request.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
    } else if (status === 'COMPLETED' && !request.completedAt) {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.waiterRequest.update({
      where: { id },
      data: updateData,
      include: { table: { select: { tableNumber: true } } },
    });

    const payload = {
      id: updated.id,
      tableNumber: updated.table.tableNumber,
      status: updated.status,
      reason: updated.reason,
      note: updated.note,
      updatedAt: updated.updatedAt,
      acknowledgedAt: updated.acknowledgedAt,
      completedAt: updated.completedAt,
    };

    // Broadcast update via Socket.IO
    try {
      notifyWaiterStatusUpdated(restaurantId, payload);
    } catch {
      // Non-critical
    }

    res.json({
      success: true,
      request: payload,
    });
  } catch (error: any) {
    console.error('Update waiter request error:', error);
    res.status(500).json({ error: 'Failed to update waiter request' });
  }
}
