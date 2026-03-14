import React from 'react';

export default async function DataDeletionStatus({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const id = params.id;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-zinc-900">Data Deletion Status</h1>
        <p className="text-zinc-600 mb-6">
          Your request to delete your data has been processed successfully. All associated data has been removed from our systems.
        </p>
        
        {id && (
          <div className="bg-zinc-100 p-4 rounded-lg">
            <p className="text-sm text-zinc-500 mb-1">Confirmation Code:</p>
            <p className="font-mono text-sm text-zinc-800 break-all">{id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
