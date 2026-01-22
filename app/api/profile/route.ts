import { NextResponse } from 'next/server';
import companyProfile from '@/data/company_profile.json';

export async function GET() {
    return NextResponse.json(companyProfile);
}
