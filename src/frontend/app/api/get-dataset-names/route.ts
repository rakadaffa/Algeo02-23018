import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const midi = await prisma.datasetMidi.findFirst();
  const picture = await prisma.datasetPicture.findFirst();
  const mapper = await prisma.mapper.findFirst();
  return NextResponse.json({
    midiName: midi?.name || null,
    pictureName: picture?.name || null,
    mapperName: mapper?.name || null,
  });
}
