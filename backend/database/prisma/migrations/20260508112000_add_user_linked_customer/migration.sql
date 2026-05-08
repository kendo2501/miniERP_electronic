-- AlterTable: add linked_customer_id to users
ALTER TABLE "users" ADD COLUMN "linked_customer_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_linked_customer_id_key" ON "users"("linked_customer_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_linked_customer_id_fkey" FOREIGN KEY ("linked_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
