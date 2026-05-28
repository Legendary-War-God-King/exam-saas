-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "access_code" TEXT;

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "student_no" TEXT NOT NULL,
    "class" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_records" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "score" INTEGER,
    "status" "RecordStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "record_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_answer" TEXT,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "time_spent" INTEGER,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("record_id","question_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_tenant_id_student_no_key" ON "students"("tenant_id", "student_no");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_records" ADD CONSTRAINT "exam_records_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_records" ADD CONSTRAINT "exam_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "exam_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
