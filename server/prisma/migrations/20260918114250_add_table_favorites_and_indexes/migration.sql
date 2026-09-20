-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "enableTableFavorites" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Order_tableId_paymentStatus_status_createdAt_idx" ON "Order"("tableId", "paymentStatus", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");
