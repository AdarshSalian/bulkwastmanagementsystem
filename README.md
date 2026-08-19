# Bulk Waste Management System

A web-based platform built with **React (Vite)** and **Node.js (Express)** to streamline the collection, transportation, processing, and disposal of bulk waste.

The system features a **premium dark-mode design system**, interactive dashboard views tailored to 4 different user roles, simulated payment integration, HTML5 Canvas route visualization, in-app notifications, and custom SVG reporting charts.

## 🚀 How to Run the Project

Follow these steps to run both the frontend and backend simultaneously:

1. **Install Dependencies**:
   This project contains root scripts to install all sub-project dependencies. Run the following command in your terminal at the root directory:
   ```bash
   npm run install-all
   ```

2. **Start the Development Servers**:
   Run the following command to start the Node.js API server (on port 5000) and the Vite frontend server concurrently:
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   Open your browser and navigate to the local address displayed by Vite (usually `http://localhost:5173`).

---

## 🔑 Default Login Credentials

We have preloaded the database with default accounts so you can log in as any role immediately:

| Role | Username | Password | Purpose / Features to Test |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin` | Approve pending generator properties, assign trucks/drivers, monitor analytics, resolve complaint tickets, manage vehicles & plants. |
| **Waste Generator** | `generator` | `password` | Register properties, request waste pickup, pay collection charges (simulated Razorpay), log support tickets. |
| **Transporter / Driver** | `driver` | `password` | View trip assignments, scale-log weight, simulate GPS navigation (Live Canvas routes). |
| **Plant Operator** | `operator` | `password` | Log incoming deliveries, execute dry/wet waste segregation, monitor facility capacity levels. |
| **Pending Generator** | `pending_generator` | `password` | Demonstration account showing how generators start as "Pending Approval" until activated by the Admin. |

---

## 🛠️ Key Technical Implementations

- **Persistent JSON Database**: Uses `backend/data/db.json` as a persistent document database. There is zero local database setup required (no MongoDB or MySQL setup needed out-of-the-box). It reads, updates, and persists state instantly to the file system.
- **Role-Based Access Control (RBAC)**: Enforced via secure JSON Web Tokens (JWT) signed on the server and attached to request headers.
- **Route Tracking Simulator**: An interactive route and GPS tracker built using HTML5 Canvas inside the Driver view, rendering real-time truck progression, depot hubs, and coordinates.
- **Mock Razorpay Checkout**: Fully animated, styled payment sandbox simulating Razorpay's custom transaction processing flow.
- **SVG Analytical Charts**: Dynamic interactive bar, pie, and progress charts built directly from database records without third-party chart dependencies, ensuring zero peer-dependency issues.
# bulkwastmanagementsystem
