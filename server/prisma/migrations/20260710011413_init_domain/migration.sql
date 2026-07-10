-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('NUMBER', 'PERCENT', 'DOLLARS');

-- CreateEnum
CREATE TYPE "Comparator" AS ENUM ('EQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN');

-- CreateEnum
CREATE TYPE "Cadence" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" "Unit" NOT NULL,
    "comparator" "Comparator" NOT NULL,
    "goal" DECIMAL(65,30) NOT NULL,
    "goalUpper" DECIMAL(65,30),
    "cadence" "Cadence" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "views" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_kpis" (
    "viewId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "view_kpis_pkey" PRIMARY KEY ("viewId","kpiId")
);

-- CreateTable
CREATE TABLE "view_accesses" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "kpis_ownerId_idx" ON "kpis"("ownerId");

-- CreateIndex
CREATE INDEX "readings_kpiId_idx" ON "readings"("kpiId");

-- CreateIndex
CREATE UNIQUE INDEX "readings_kpiId_periodKey_key" ON "readings"("kpiId", "periodKey");

-- CreateIndex
CREATE INDEX "views_ownerId_idx" ON "views"("ownerId");

-- CreateIndex
CREATE INDEX "view_kpis_kpiId_idx" ON "view_kpis"("kpiId");

-- CreateIndex
CREATE INDEX "view_accesses_userId_idx" ON "view_accesses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "view_accesses_viewId_userId_key" ON "view_accesses"("viewId", "userId");

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_kpis" ADD CONSTRAINT "view_kpis_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_kpis" ADD CONSTRAINT "view_kpis_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_accesses" ADD CONSTRAINT "view_accesses_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_accesses" ADD CONSTRAINT "view_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_accesses" ADD CONSTRAINT "view_accesses_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
