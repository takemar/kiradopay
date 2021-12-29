/*
  Warnings:

  - You are about to drop the column `unitPrice` on the `items` table. All the data in the column will be lost.
  - Added the required column `code` to the `items` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "img" TEXT,
    "event_id" INTEGER NOT NULL,
    CONSTRAINT "items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_items" ("code", "event_id", "id", "img", "name") SELECT "id", "event_id", "id", "img", "name" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
