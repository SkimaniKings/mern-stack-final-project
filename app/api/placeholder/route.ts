// app/api/placeholder/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'This endpoint is not implemented or is a placeholder.' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ message: 'This endpoint is not implemented or is a placeholder.' }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ message: 'This endpoint is not implemented or is a placeholder.' }, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json({ message: 'This endpoint is not implemented or is a placeholder.' }, { status: 404 });
}

export async function PATCH() {
  return NextResponse.json({ message: 'This endpoint is not implemented or is a placeholder.' }, { status: 404 });
}
