export const Card = ({ children }) => (
  <div className="border rounded-lg shadow-md p-4 bg-white dark:bg-gray-800">{children}</div>
);

export const CardHeader = ({ children }) => (
  <div className="mb-2 font-semibold text-lg">{children}</div>
);

export const CardContent = ({ children }) => (
  <div className="text-base">{children}</div>
);

export const CardTitle = ({ children }) => (
  <h2 className="text-xl font-bold">{children}</h2>
);
