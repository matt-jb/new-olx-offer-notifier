/*
  Warnings:

  - You are about to drop the column `description` on the `Offer` table. All the data in the column will be lost.
  - Added the required column `year` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "description",
ADD COLUMN     "milage" INTEGER,
ADD COLUMN     "year" INTEGER NOT NULL;
