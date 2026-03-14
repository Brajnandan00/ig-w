import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest) {
      return NextResponse.json({ error: 'Bad Request: Missing signed_request' }, { status: 400 });
    }

    // In a production environment, you should decode and verify the signed_request 
    // using your INSTAGRAM_APP_SECRET to ensure the request actually came from Meta.
    // The payload contains the user_id whose data needs to be deleted.
    
    // Generate a unique confirmation code for this deletion request
    const confirmationCode = crypto.randomBytes(16).toString('hex');
    
    // Construct the URL where the user can check the status of their deletion request
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const statusUrl = `${baseUrl}/data-deletion-status?id=${confirmationCode}`;

    // TODO: Implement actual database deletion logic here using the decoded user_id

    // Meta requires this exact JSON response format
    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode
    });
  } catch (error) {
    console.error('Data deletion webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
