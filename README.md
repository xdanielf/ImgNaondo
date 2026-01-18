# ImgNaondo

A fast, lean and powerful image hosting solution designed specifically for Cloudflare Workers.

## Features
- **Storage**: Uses Cloudflare R2 for cheap/free object storage.
- **Database**: Uses Cloudflare D1 for fast metadata searching, filtering, and sorting.
- **Search**: Real-time search by name or tag.
- **Tags**: Organize images with tags.
- **Security**: Password protected access.

## One-Click Deployment (Windows)

1.  **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed.
2.  **Download**: Clone this repository or download the files.
3.  **Run**: Double-click `deploy.bat`.
    *   It will ask you to log in to Cloudflare.
    *   It will automatically create the `imgnaondo` R2 bucket and `imgnaondo-db` D1 database.
    *   It will ask you to set an access password.
    *   It will deploy the worker to your account.

## Manual Deployment

1.  Install dependencies: `npm install`
2.  Create R2 Bucket: `npx wrangler r2 bucket create imgnaondo`
3.  Create D1 Database: `npx wrangler d1 create imgnaondo-db`
4.  Update `wrangler.toml` with your Database ID.
5.  Initialize Database: `npx wrangler d1 execute imgnaondo-db --file=schema.sql --remote`
6.  Deploy: `npx wrangler deploy`

## Migration from Old Version

If you are upgrading from the version that only used R2:
1.  Deploy the new version using the instructions above.
2.  Log in to your new ImgNaondo website.
3.  Click the **↻ Sync** button in the header (top right).
4.  This will read all existing files from R2 and populate the search database.

**Hope you will support me.**

- **Bitcoin:** bc1qls4n5ttjwn6c6fqp5pqp4pelcn6tzqyva9v4lg
- **Ethereum:** 0x734fb2a5a12a6e50cac346a2850b47b9ec690ba6
- **Solana:** 7QZLPZhTVxxtRpRYXxRTcZQoqtNkbP2tAeB6J41NS3BJ
- **BNB Smart Chain:** 0x734fb2a5a12a6e50cac346a2850b47b9ec690ba6