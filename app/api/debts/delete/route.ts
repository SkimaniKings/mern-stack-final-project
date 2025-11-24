import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { debtId } = await request.json();

    if (!debtId) {
      return NextResponse.json(
        { success: false, error: 'Debt ID is required' },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 },
      );
    }

    console.log(`Attempting to delete debt ${debtId} for user ${user.id}`);

    const { error, count } = await supabase
      .from('debts')
      .delete({ count: 'exact' })
      .eq('id', debtId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting debt:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to delete debt', error: error.message },
        { status: 500 },
      );
    }

    if (count === 0) {
      console.warn(
        `No debt found with ID ${debtId} for user ${user.id}. Nothing deleted.`,
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Debt not found or you do not have permission to delete it.',
        },
        { status: 404 },
      );
    }

    console.log(`Successfully deleted ${count} debt record(s).`);

    return NextResponse.json({
      success: true,
      message: 'Debt deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error deleting debt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}




