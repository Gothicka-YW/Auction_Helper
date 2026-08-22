# Auction Helper v1.6.0

A side-panel Chrome extension for manually organizing and running YoWorld auctions.

## Persistence

Auction Helper uses a fixed Chrome manifest `key`, so future unpacked builds keep the same development extension ID and continue using the same local extension storage.

- Stable extension ID: `mihdnmjillhcnkemdglgpllkllklhifl`
- Persistent storage key: `closedAuctionHelperStateV1`
- Internal schema versioning is used so future releases can migrate stored auction data instead of replacing it.

**Important:** the storage key intentionally keeps its older internal name for backward compatibility. Renaming it would risk losing access to existing saved auction data.

If you entered data in a pre-v1.4.0 build that did not use the stable extension ID, export its JSON backup once and import it into this stable-ID build.

## Features

- Side-panel-only interface; no popup
- YoWorld.info item search
- YoWorld CDN item thumbnails
- Single-item auction lots
- Multi-item bundle auction lots
- One Reserve / Starting Bid value per lot
- Quantity for single-item lots
- Ready / Sold / No Sale tracking
- Buyer and final sold price
- Reserve-vs-sale comparison
- Separate searchable History view for Sold / No Sale records
- YoWorld image repair for single items and bundle components
- Per-item repair controls plus a global Repair Images action
- Initials fallback when an image cannot be loaded
- Selectable bundle cover icons, preserved in JSON backup/import
- Quick-copy item and bundle-component names
- Screenshot-ready **View All Items** gallery for every current, queued, active, and historical lot
- Full saved item names and icons in a clean bundle grid for Facebook auction-post screenshots
- Current lot and next-up queue
- Search, filters, drag reorder, and manual up/down reorder
- JSON backup and restore
- CSV auction-data export for Excel / Google Sheets
- Local Chrome storage

## Install / update

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `Auction_Helper` folder.
5. For future updates, replace/update the files in the same folder and click **Reload** on the extension card.
6. Click the extension icon to open Auction Helper directly in Chrome's side panel.

## Coin entry examples

- `750k`
- `1.5m`
- `42m`
- `1.2b`
- `2500000`

## Network permissions

Auction Helper only requests catalog/image access to:

- `https://api.yoworld.info/*`
- `https://yw-web.yoworld.com/*`

These are used for manual item search and item thumbnails.

## Safety / scope

Auction Helper is a manual organizer. It does not click, bid, trade, automate gameplay, inspect YoWorld network traffic, or send gameplay actions to YoWorld.

## Version notes

### v1.6.0
- Added **View All Items** controls to current, queued, active-list, and history lots.
- Added a screenshot-ready lot gallery that shows every saved bundle item name and icon without reopening YoWorld.info.
- Added compact layouts for larger bundles and **Copy All Names** inside the gallery.

### v1.5.0
- Added individual and global **Repair Images** actions that rebuild YoWorld CDN URLs from saved item IDs.
- Added a graceful initials fallback for images that still cannot load.
- Added bundle cover-icon selection and preserved the selected component in JSON and CSV exports.
- Moved completed Sold / No Sale lots into a separate History view with search, filters, pricing differences, buyer, quantity, notes, item IDs, bundle contents, and completion dates.
- Preserved bundle component names and icons in history and kept quick-copy controls throughout.
- Migrates older saved completed lots into History while retaining the fixed extension identity and `closedAuctionHelperStateV1` storage key.

### v1.4.2
- Added quick-copy name controls for current, queued, catalog, list, and bundle items.

### v1.4.1
- Renamed the extension from **Closed Auction Helper** to **Auction Helper**.
- Preserved the stable extension ID and existing Chrome storage key so saved auction data remains compatible.
- Established the independent `Gothicka-YW/Auction_Helper` repository as the project's source of truth.

### v1.4.0
- Added fixed Chrome extension identity for future unpacked-build persistence.
- Added explicit internal data schema versioning.

### v1.3.0
- Added CSV auction-data export.

### v1.2.0–v1.2.1
- Added bundle auction support.
- Fixed side-panel button startup registration.
