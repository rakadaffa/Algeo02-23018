-- CreateTable
CREATE TABLE "DatasetPicture" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DatasetPicture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetMidi" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DatasetMidi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mapper" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Mapper_pkey" PRIMARY KEY ("id")
);
