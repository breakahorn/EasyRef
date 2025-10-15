# EasyRef - Your Personal Visual Reference Library

![EasyRef Banner](https://user-images.githubusercontent.com/12345/placeholder.jpg) <!-- Replace with a cool banner image -->

**EasyRef** is a self-hosted, open-source web application designed for artists, designers, and creators to effortlessly collect, manage, and utilize their visual references. Say goodbye to scattered folders and hello to a streamlined, searchable, and inspiring creative workflow.

This application combines a powerful file gallery with an intuitive "Reference Board" feature, allowing you to build mood boards, study sheets, or inspiration canvases with your own assets.

---

## ✨ Key Features

- **🖼️ Centralized Media Gallery**: Upload and view all your images and videos in one place.
- **🏷️ Advanced Tagging & Metadata**: Organize your assets with custom tags, ratings, notes, and source URLs.
- **🔍 Powerful Search & Filtering**: Quickly find the exact file you need by searching tags (AND/OR logic), ratings, favorites, or file type.
- **🎨 Interactive Reference Boards**:
    - Create multiple boards for different projects or ideas.
    - Drag and drop files from your gallery onto a board.
    - Freely **move**, **scale**, **rotate**, and **layer** items on the canvas.
    - All board layouts are automatically saved.
- **🚀 Fast & Modern Tech**: Built with a snappy FastAPI backend and a responsive React frontend.
- **🏠 Self-Hosted**: Your data stays with you. Run it on your local machine or your own server.

---

## 📸 Screenshots

*(Here you can add screenshots of the application)*

| Gallery View                               | Board View                                 |
| ------------------------------------------ | ------------------------------------------ |
| ![Gallery Screenshot](https://user-images.githubusercontent.com/12345/gallery.jpg) | ![Board Screenshot](https://user-images.githubusercontent.com/12345/board.jpg) |

---

## 🛠️ Tech Stack

This project is a monorepo with a separate backend and frontend.

**Backend:**
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: [SQLAlchemy](https://www.sqlalchemy.org/) ORM with [SQLite](https://www.sqlite.org/index.html)
- **Image/Video Processing**: [OpenCV-Python](https://pypi.org/project/opencv-python/) for metadata extraction

**Frontend:**
- **Framework**: [React](https://react.dev/) (with TypeScript)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Routing**: [React Router](https://reactrouter.com/)
- **Canvas/Graphics**: [Konva.js](https://konvajs.org/) & [react-konva](https://github.com/konvajs/react-konva)
- **Drag & Drop**: [React-DnD](https://react-dnd.github.io/react-dnd/about)
- **API Communication**: [Axios](https://axios-http.com/)

---

## 🚀 Getting Started

Follow these instructions to get a local copy up and running for development and testing.

### Prerequisites

- [Python](https://www.python.org/downloads/) (3.8 or higher)
- [Node.js](https://nodejs.org/) (v18 or higher) and npm
- [Git](https://git-scm.com/)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/EasyRef.git
    cd EasyRef
    ```

2.  **Set up the Backend:**
    ```sh
    # Navigate to the backend directory
    cd backend

    # Create and activate a virtual environment (recommended)
    python -m venv .venv
    # On Windows
    .venv\Scripts\activate
    # On macOS/Linux
    source .venv/bin/activate

    # Install Python dependencies
    pip install -r requirements.txt  # You may need to create this file first from imports

    # Run the backend server
    uvicorn main:app --reload
    ```
    The API will be running at `http://127.0.0.1:8000`.

3.  **Set up the Frontend:**
    ```sh
    # Open a new terminal and navigate to the frontend directory
    cd frontend

    # Install JavaScript dependencies
    npm install

    # Run the frontend development server
    npm run dev
    ```
    The application will be available in your browser at `http://localhost:5173`.

---

## 📖 API Endpoints

The backend provides a RESTful API for managing all resources.

<details>
<summary><strong>Click to expand API endpoint summary</strong></summary>

| Method | Endpoint                      | Description                                      |
|--------|-------------------------------|--------------------------------------------------|
| **Files** | | |
| `POST` | `/files/upload`               | Upload one or more files.                        |
| `GET`  | `/files`                      | Get a list of all files.                         |
| `GET`  | `/files/search`               | Search for files based on various criteria.      |
| `GET`  | `/storage/{filename}`         | Serve a specific file from storage.              |
| `PUT`  | `/files/{file_id}/metadata`   | Update metadata for a file.                      |
| `DELETE`| `/files/{file_id}`            | Delete a file from the database and storage.     |
| **Tags** | | |
| `GET`  | `/tags`                       | Get a list of all unique tags.                   |
| `POST` | `/files/{file_id}/tags`       | Add a tag to a file.                             |
| `DELETE`| `/files/{file_id}/tags/{tag_id}` | Remove a tag from a file.                     |
| **Boards** | | |
| `POST` | `/boards`                     | Create a new board.                              |
| `GET`  | `/boards`                     | Get a list of all boards.                        |
| `GET`  | `/boards/{board_id}`          | Get details of a specific board with its items.  |
| `PUT`  | `/boards/{board_id}`          | Update a board's name or description.            |
| `DELETE`| `/boards/{board_id}`          | Delete a board.                                  |
| **Board Items** | | |
| `POST` | `/boards/{board_id}/items`    | Add a file (item) to a board.                    |
| `PUT`  | `/items/{item_id}`            | Update an item's position, size, rotation, etc.  |
| `PUT`  | `/items/{item_id}/reset`      | Reset an item's transformations to its original state. |
| `DELETE`| `/items/{item_id}`            | Remove an item from a board.                     |

</details>

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` file for more information. (You'll need to add a LICENSE file).

---

## 🙏 Acknowledgements

- A big thank you to the creators of all the open-source libraries used in this project.
- Hat tip to any similar applications that provided inspiration.

