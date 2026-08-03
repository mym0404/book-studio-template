/** Keeps DATABASE_URL as the single connection source for every feature repository. */
export const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  return databaseUrl;
};
