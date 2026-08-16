# Shopify Storefront – Technical Assignment & Theme Documentation

A modern, high-performance **Shopify Online Store 2.0** theme built with modular architecture, custom Metaobject-driven interactive configurators, wholesale access control, dynamic AJAX cart systems, and centralized analytics integrations.

---

## 📋 Table of Contents

- [Quick Start: Previewing the Theme](#-quick-start-previewing-the-theme)
  - [Prerequisites](#prerequisites)
  - [Method 1: Shopify CLI Local Preview (Recommended)](#method-1-shopify-cli-local-preview-recommended)
  - [Method 2: Upload as ZIP File via Shopify Admin](#method-2-upload-as-zip-file-via-shopify-admin)
  - [Method 3: Push as an Unpublished Theme via CLI](#method-3-push-as-an-unpublished-theme-via-cli)
- [Key Features & Technical Implementations](#-key-features--technical-implementations)
  - [1. Multi-Step Product Configurator Engine](#1-multi-step-product-configurator-engine)
  - [2. Wholesale / B2B Gating & Access Control](#2-wholesale--b2b-gating--access-control)
  - [3. Modern Cart Architecture (Drawer & Page)](#3-modern-cart-architecture-drawer--page)
  - [4. Marketing, Tracking & Live Chat Integrations](#4-marketing-tracking--live-chat-integrations)
  - [5. Expivi 3D Product Visualization](#5-expivi-3d-product-visualization)
- [Metaobject & Metafield Data Schema](#-metaobject--metafield-data-schema)
- [Directory & Theme Architecture](#-directory--theme-architecture)
- [Theme Settings & Customization](#-theme-settings--customization)
- [Development & Code Quality Standards](#-development--code-quality-standards)

---

## 🚀 Quick Start: Previewing the Theme

Follow these straightforward instructions to preview and test the complete theme on any Shopify development store without manual setup hurdles.

### Prerequisites

Ensure the following tools are installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Shopify CLI**: v3.x or higher
  ```bash
  npm install -g @shopify/cli @shopify/theme
  ```
- Access to a **Shopify Partner / Development Store**.

---

### Method 1: Shopify CLI Local Preview (Recommended)

Run a local development server with hot-reload and direct Storefront / Theme Editor synchronization.

1. **Clone or navigate to the project directory:**
   ```bash
   cd Assignment
   ```

2. **Authenticate and launch the development server:**
   ```bash
   shopify theme dev --store your-dev-store.myshopify.com
   ```

3. **Interact with the generated endpoints in your terminal:**
   - **Local Storefront Preview**: `http://127.0.0.1:9292`
   - **Theme Editor (Customizer) URL**: `https://your-dev-store.myshopify.com/admin/themes/.../editor`
   - **Hot-Reloading**: Changes to `.liquid`, `.css`, or `.js` will automatically sync in real-time.

---

### Method 2: Upload as ZIP File via Shopify Admin

To preview directly in Shopify Admin without running the CLI locally:

1. **Package the theme into a `.zip` archive:**
   - Ensure the root of the `.zip` archive contains `layout/`, `templates/`, `sections/`, `snippets/`, `assets/`, `config/`, and `locales/`.
2. **Go to Shopify Admin:**
   - Navigate to **Online Store** > **Themes**.
   - Under the **Theme Library** section, click **Add Theme** > **Upload zip file**.
   - Choose the generated `.zip` file and click **Upload file**.
3. **Preview & Test:**
   - Once uploaded, click **Actions** (`...`) > **Preview** to view the live storefront.
   - Click **Customize** to test Theme Settings (Cart Drawer toggle, Analytics Pixel inputs, Tawk.to Live Chat, etc.).

---

### Method 3: Push as an Unpublished Theme via CLI

Push the codebase as a standalone draft theme directly to your development store:

```bash
shopify theme push --unpublished --theme "Assessment - Skeleton Extended" --store your-dev-store.myshopify.com
```

The CLI will output a direct preview link and a Theme Customizer link.

---

## 🛠 Key Features & Technical Implementations

### 1. Multi-Step Product Configurator Engine
- **Metaobject Driven**: Powered by Shopify Metaobjects (`custom.configurator`) attached to products via metafields.
- **Dynamic Rule Evaluation**: Client-side rule engine evaluated in [product-configurator.js](file:///c:/Users/alami/Desktop/Assignment/assets/product-configurator.js) supporting conditional dependencies, hidden options, auto-selections, and add-on price calculations.
- **Real-Time Total Recalculation**: Dynamically updates the base variant price with selected add-on totals before checkout.
- **Line Item Property Preservation**: Formats all user choices into clean Shopify Cart Line Item Properties (`_config_...` and human-readable property keys) for order processing.
- **Summary Cards & Navigation**: Allows shoppers to review previous choices, jump between steps, or edit configurations effortlessly.

### 2. Wholesale / B2B Gating & Access Control
- **Gated Product Detection**: Products tagged with `wholesale` / `wholesale-only` or with metafield `custom.wholesale = true` are restricted.
- **Customer Tag Verification**: Liquid checks `customer.tags contains 'wholesale'`.
- **Search & Collection Filtering**: Wholesale-restricted products are automatically excluded from public collection grids, collections lists, and search queries for non-wholesale visitors.
- **Access Gate Display**: Direct navigation to a wholesale product page renders a dedicated lock screen prompting the user to log in with verified wholesale credentials.

### 3. Modern Cart Architecture (Drawer & Page)
- **AJAX Slide-Out Cart Drawer** ([cart-drawer.liquid](file:///c:/Users/alami/Desktop/Assignment/snippets/cart-drawer.liquid) & [cart-drawer.js](file:///c:/Users/alami/Desktop/Assignment/assets/cart-drawer.js)):
  - Backdrop blur overlay with smooth slide transition.
  - Real-time quantity adjustments and item removal via Shopify Cart API.
  - Fully renders custom line-item properties and configurator add-on summaries.
  - Order notes input and free shipping / subtotal breakdown.
- **Dedicated Full Cart Page** ([cart.liquid](file:///c:/Users/alami/Desktop/Assignment/sections/cart.liquid)):
  - Comprehensive table layout with responsive mobile cards.
  - Configurable in Theme Settings to choose between **Slide-Out Drawer** or **Cart Page Redirect**.

### 4. Marketing, Tracking & Live Chat Integrations
- Centralized tracking snippet ([analytics-pixels.liquid](file:///c:/Users/alami/Desktop/Assignment/snippets/analytics-pixels.liquid)) configurable via Theme Settings (`config/settings_schema.json`):
  - **Google Analytics 4 (GA4)**: Configurable Measurement ID (`G-XXXXXXXXXX`).
  - **Meta / Facebook Pixel**: Configurable Pixel ID with standard PageView & ViewContent events.
  - **TikTok Pixel**: Configurable Pixel ID.
  - **Pinterest Tag**: Configurable Conversion Tag ID.
  - **Google Ads Conversion Tracking**: Configurable Conversion ID & Label.
- **Tawk.to Live Chat** ([tawkto-chat.liquid](file:///c:/Users/alami/Desktop/Assignment/snippets/tawkto-chat.liquid)): Enable/disable toggle and custom widget path setting.

### 5. Expivi 3D Product Visualization
- Interactive 3D viewer snippet ([expivi-viewer.liquid](file:///c:/Users/alami/Desktop/Assignment/snippets/expivi-viewer.liquid)) allowing 360° interactive product inspection for products with metafield `custom.expivi_project_id` or tag `expivi-3d`.

---

## 🗄 Metaobject & Metafield Data Schema

To test the Product Configurator with full dynamic capabilities, configure the following Metaobject definition in Shopify Admin (**Settings > Custom Data > Metaobjects**):

### Metaobject: `configurator` (`custom.configurator`)

| Field Name | Key | Type | Description |
| :--- | :--- | :--- | :--- |
| **Name** | `name` | Single line text | Configurator display name |
| **Handle** | `handleConfigurator` | Single line text | Unique handle identifier |
| **Description** | `description` | Multi-line text | Subtitle / guidance text |
| **Active** | `active` | True / False | Enable / disable toggle |
| **Steps** | `steps` | List of Metaobjects / JSON | Step definitions, options, and rules |

#### Sample Step Configuration JSON:
```json
[
  {
    "step_id": "step_material",
    "title": "Select Base Material",
    "required": true,
    "options": [
      { "label": "Brushed Aluminum", "value": "aluminum", "price": 0 },
      { "label": "Matte Carbon Fiber", "value": "carbon", "price": 2500 }
    ]
  },
  {
    "step_id": "step_finish",
    "title": "Custom Finish",
    "required": false,
    "options": [
      { "label": "Gloss Coating", "value": "gloss", "price": 1000 },
      { "label": "UV Protection Shield", "value": "uv", "price": 1500 }
    ]
  }
]
```

---

## 📁 Directory & Theme Architecture

```bash
.
├── assets/
│   ├── cart-drawer.js             # AJAX cart drawer controller & DOM management
│   ├── critical.css               # Core styling & critical rendering path rules
│   ├── product-configurator.css   # Multi-step configurator responsive styling
│   └── product-configurator.js    # Rule engine, price math, and step validation
├── config/
│   ├── settings_data.json         # Current theme setting values & defaults
│   └── settings_schema.json       # Admin schema: Cart type, Pixels, Live Chat, Fonts
├── layout/
│   └── theme.liquid               # Master document wrapper with modular snippet includes
├── sections/
│   ├── announcement-bar.liquid    # Promotional top announcement banner
│   ├── cart.liquid                # Full-page cart template with line item properties
│   ├── collection.liquid          # Filterable collection template with wholesale gate
│   ├── collections.liquid         # Collections list showcase
│   ├── header.liquid              # Sticky header, desktop & mobile navigation drawer
│   ├── product.liquid             # Dawn-inspired PDP with media gallery & configurator
│   └── search.liquid              # Search page with wholesale access filtering
├── snippets/
│   ├── analytics-pixels.liquid    # GA4, Meta, TikTok, Pinterest & Google Ads tags
│   ├── cart-drawer.liquid         # Slide-out AJAX cart drawer markup & styling
│   ├── expivi-viewer.liquid       # 3D interactive product visualization viewer
│   ├── product-configurator.liquid# Configurator Liquid renderer & JSON payload exporter
│   └── tawkto-chat.liquid         # Tawk.to live chat widget embed
└── templates/                     # Shopify Online Store 2.0 JSON templates
```

---

## ⚙️ Theme Settings & Customization

All major components can be configured through the **Shopify Theme Customizer**:

1. **Cart Behavior**:
   - Go to **Theme Settings > Cart**.
   - Choose between **Open Slide-out Cart Drawer** or **Redirect to Cart Page**.
2. **Analytics & Tracking**:
   - Go to **Theme Settings > Analytics & Tracking**.
   - Toggle **Google Analytics 4**, **Meta Pixel**, **TikTok Pixel**, **Pinterest Tag**, or **Google Ads**, and input your respective tracking IDs.
3. **Live Chat**:
   - Go to **Theme Settings > Live Chat**.
   - Enable/Disable the widget and configure your **Tawk.to Property/Widget Path**.

---

## 🏆 Development & Code Quality Standards

- **Online Store 2.0 Architecture**: Strictly utilizes modular JSON templates, sections, snippets, and theme blocks.
- **Vanilla JavaScript**: Lightweight, performant ES6+ JavaScript without reliance on heavy external libraries like jQuery.
- **Liquid Best Practices**: Clean filters, strict defensive null checks, and minimal layout shift.
- **Accessibility & Responsiveness**: Semantic HTML5 markup, ARIA roles for modals/drawers, keyboard navigability, and responsive layouts across desktop, tablet, and mobile.

---

### Author & Assignment Details
- **Project**: Shopify Developer Technical Assessment
- **Theme**: Skeleton Extended (OS 2.0)
- **Status**: Production-Ready / Review Ready
