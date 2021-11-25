PRAGMA foreign_keys=OFF;

ALTER TABLE "sales_records" RENAME TO "old_sales_records";

CREATE TABLE "sales_records" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "event_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    CONSTRAINT "sales_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "sales_records" ("code", "client_id", "event_id", "timestamp") SELECT "id", "client_id", "event_id", "timestamp" FROM "old_sales_records";

CREATE TABLE "items_on_sales_records" (
    "item_id" INTEGER NOT NULL,
    "sales_record_code" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    PRIMARY KEY ("item_id", "sales_record_code"),
    CONSTRAINT "items_on_sales_records_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "items_on_sales_records_sales_record_code_fkey" FOREIGN KEY ("sales_record_code") REFERENCES "sales_records" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "items_on_sales_records" ("item_id", "sales_record_code", "number") SELECT "A" , "B", 1 AS "number" FROM "_items_to_sales_records";

DROP TABLE "old_sales_records";
DROP INDEX "_items_to_sales_records_B_index";
DROP INDEX "_items_to_sales_records_AB_unique";
DROP TABLE "_items_to_sales_records";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
