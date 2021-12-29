/*
  Warnings:

  - Added the required column `total_amount` to the `sales_records` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sales_records" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    CONSTRAINT "sales_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sales_records" ("client_id", "code", "event_id", "timestamp", "total_amount") SELECT "client_id", "code", "event_id", "timestamp", 0 FROM "sales_records";
DROP TABLE "sales_records";
ALTER TABLE "new_sales_records" RENAME TO "sales_records";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
