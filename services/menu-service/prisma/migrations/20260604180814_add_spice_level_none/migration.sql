/*
  Warnings:

  - You are about to drop the column `isAvailable` on the `add_ons` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SpiceLevel" ADD VALUE 'none';

-- AlterTable
ALTER TABLE "add_ons" DROP COLUMN "isAvailable";
