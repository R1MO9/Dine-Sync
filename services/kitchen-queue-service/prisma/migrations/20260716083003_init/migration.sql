-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('queued', 'preparing', 'ready', 'served', 'cancelled');

-- CreateTable
CREATE TABLE "queue_tickets" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'queued',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "queue_tickets_orderId_key" ON "queue_tickets"("orderId");

-- CreateIndex
CREATE INDEX "queue_tickets_restaurantId_status_idx" ON "queue_tickets"("restaurantId", "status");
