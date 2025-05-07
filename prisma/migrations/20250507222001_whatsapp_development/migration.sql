-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "sender" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "caption" TEXT,
    "status" TEXT NOT NULL,
    "whatsappId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_apiKey_key" ON "Session"("apiKey");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
