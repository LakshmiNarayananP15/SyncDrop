# SyncDrop Architecture & Details

SyncDrop is a local Wi-Fi file transfer tool designed to seamlessly sync files between a mobile device and a PC on the same network. It serves two distinct interfaces based on the device accessing it.

## Frontend Details

The frontend is a responsive Single-Page Application (SPA) built to deliver a highly polished, interactive user experience.

### Tech Stack
*   **Framework:** React 19 (Functional components, Hooks)
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (v4)
*   **Animations:** `motion` (Framer Motion)
*   **Icons:** `lucide-react`

### Design System: "Frosted Glass"
The application utilizes a deep dark mode aesthetic (Slate and Obsidian base colors) heavily featuring Glassmorphism.
*   **Visuals:** Deep glowing background mesh gradients, semi-transparent layers with backdrop-blur (`backdrop-blur-md`, `backdrop-blur-xl`), and subtle borders to define depth.
*   **Colors:** 
    *   *Primary Actions/Branding:* Electric Blue (`blue-400`, `blue-500`, `blue-600`)
    *   *Success/Active States:* Emerald Green (`emerald-400`, `emerald-500`)
*   **Typography:** System Sans-serif for general UI and Monospace for technical data (IP addresses, sizes).

### UI Architecture (Dual Layout)
The application dynamically switches between two completely different layouts based on viewport width (using a custom `useIsMobile` hook tracking the `min-width: 768px` breakpoint).

#### 1. Mobile View (The Sender)
Designed for small screens to act as the file selection and uploading interface.
*   **File Input:** Supports both native file browser selection and drag-and-drop via an interactive drop zone.
*   **Queue Management:** Displays a list of selected files with sizes. Users can remove files before sending.
*   **Transfer State:** 
    *   Shows detailed progress including current file index, current file name, and total bytes transferred vs total bytes.
    *   Smooth progress bar animated via `motion`.
    *   Ability to cancel an ongoing transfer.
    *   Dedicated success screen displaying a prominent checkmark upon completion.

#### 2. Desktop View (The Receiver / Host)
Designed for larger screens to act as a dashboard monitoring incoming files.
*   **QR Code Connection:** Displays a (currently placeholder) QR code for mobile devices to scan and quickly navigate to the local IP address.
*   **Session Details:** Shows network information such as the local IP endpoint, active port, and network protocol.
*   **Transfer History:** A list displaying recently received files, their sizes, and relative time of receipt.
*   **Real-time status:** A pulsing indicator showing that the desktop is waiting for incoming connections.

## Backend Details

*Note: The current iteration focuses on the frontend mockup and simulated transfers. Below are the architectural details for the intended backend integration.*

### Setup & Routing
*   **Dynamic API Routing:** The frontend dynamically targets the backend using the local network IP via `const API_URL = 'http://' + window.location.hostname + ':5000';`. This ensures that a mobile device reaching the React app can successfully address the API running on the host machine.
*   **Port:** The intended API server runs on port `5000`.

### Communication Protocols
*   **Primary Transfer:** TCP connections handled via REST API endpoints (e.g., `POST /upload` for incoming files).
*   **Real-time Updates:** WebSocket connections (or Server-Sent Events) to push transfer progress, file completion events, and session statuses from the host to the connected clients.

### Target Capabilities
*   **Local Network Discovery:** Ensuring devices on the same Wi-Fi can locate the host via mDNS (Bonjour/Avahi) or manual IP entry.
*   **File Handling:** Streaming file uploads directly to the desktop's hard drive to bypass memory limits on large files.
*   **Security:** Peer-to-peer transferring ensures data does not leave the local network. 

---
*Version: 1.0.4-STABLE (Frontend Mockup Phase)*
