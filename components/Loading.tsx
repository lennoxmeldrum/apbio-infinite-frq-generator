import React from 'react';

const Loading: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-6">
    <div className="relative w-24 h-24">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-200 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
    </div>
    <div className="text-xl font-medium text-indigo-900 animate-pulse">{message}</div>
    <div className="text-sm text-gray-500 max-w-md text-center">
        This uses advanced reasoning models to ensure the physics is accurate. It may take up to 30 seconds.
    </div>
  </div>
);

export default Loading;
