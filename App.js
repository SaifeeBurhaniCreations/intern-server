import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage (in production, you'd use a database)
const books = new Map();

// Helper function to generate unique IDs
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Middleware for input validation
const validateBook = (req, res, next) => {
    const { title, author, isbn, publishedYear, genre } = req.body;

    if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
    }

    if (!author || author.trim().length === 0) {
        return res.status(400).json({ error: "Author is required" });
    }

    next();
};

// GET /api/books - Get all books
app.get("/api/books", (req, res) => {
    try {
        const booksList = Array.from(books.values());
        res.json({
            success: true,
            data: booksList,
            count: booksList.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve books"
        });
    }
});

// GET /api/books/:id - Get a specific book by ID
app.get("/api/books/:id", (req, res) => {
    try {
        const { id } = req.params;
        const book = books.get(id);

        if (!book) {
            return res.status(404).json({
                success: false,
                error: "Book not found"
            });
        }

        res.json({
            success: true,
            data: book
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to retrieve book"
        });
    }
});

// POST /api/books - Create a new book
app.post("/api/books", validateBook, (req, res) => {
    try {
        const { title, author, isbn, publishedYear, genre, description } = req.body;

        const newBook = {
            id: generateId(),
            title: title.trim(),
            author: author.trim(),
            isbn: isbn || null,
            publishedYear: publishedYear || null,
            genre: genre || null,
            description: description || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        books.set(newBook.id, newBook);

        res.status(201).json({
            success: true,
            data: newBook,
            message: "Book created successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to create book"
        });
    }
});

// PUT /api/books/:id - Update a book completely
app.put("/api/books/:id", validateBook, (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, isbn, publishedYear, genre, description } = req.body;

        if (!books.has(id)) {
            return res.status(404).json({
                success: false,
                error: "Book not found"
            });
        }

        const updatedBook = {
            id,
            title: title.trim(),
            author: author.trim(),
            isbn: isbn || null,
            publishedYear: publishedYear || null,
            genre: genre || null,
            description: description || null,
            createdAt: books.get(id).createdAt,
            updatedAt: new Date().toISOString()
        };

        books.set(id, updatedBook);

        res.json({
            success: true,
            data: updatedBook,
            message: "Book updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to update book"
        });
    }
});

// PATCH /api/books/:id - Partially update a book
app.patch("/api/books/:id", (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!books.has(id)) {
            return res.status(404).json({
                success: false,
                error: "Book not found"
            });
        }

        const existingBook = books.get(id);
        const updatedBook = {
            ...existingBook,
            ...updates,
            id, // Ensure ID doesn't change
            createdAt: existingBook.createdAt, // Preserve creation date
            updatedAt: new Date().toISOString()
        };

        // Validate required fields if they're being updated
        if (updates.title !== undefined && (!updates.title || updates.title.trim().length === 0)) {
            return res.status(400).json({ error: "Title cannot be empty" });
        }

        if (updates.author !== undefined && (!updates.author || updates.author.trim().length === 0)) {
            return res.status(400).json({ error: "Author cannot be empty" });
        }

        books.set(id, updatedBook);

        res.json({
            success: true,
            data: updatedBook,
            message: "Book updated successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to update book"
        });
    }
});

// DELETE /api/books/:id - Delete a book
app.delete("/api/books/:id", (req, res) => {
    try {
        const { id } = req.params;

        if (!books.has(id)) {
            return res.status(404).json({
                success: false,
                error: "Book not found"
            });
        }

        const deletedBook = books.get(id);
        books.delete(id);

        res.json({
            success: true,
            data: deletedBook,
            message: "Book deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to delete book"
        });
    }
});

// DELETE /api/books - Delete all books
app.delete("/api/books", (req, res) => {
    try {
        const booksCount = books.size;
        books.clear();

        res.json({
            success: true,
            message: `All ${booksCount} books deleted successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Failed to delete books"
        });
    }
});

// Search books by title or author
app.get("/api/books/search/:query?", (req, res) => {
    const { query } = req.params;

    if (!query || query.trim() === "") {
        return res.status(400).json({
            success: false,
            error: "Search query is required"
        });
    }

    const searchTerm = query.toLowerCase();
    const filteredBooks = Array.from(books.values()).filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );

    res.json({
        success: true,
        data: filteredBooks,
        count: filteredBooks.length,
        searchTerm: query
    });
});


// 404 handler for undefined routes
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation:`);
    console.log(`GET    /api/books           - Get all books`);
    console.log(`GET    /api/books/:id       - Get a specific book`);
    console.log(`GET    /api/books/search/:query - Search books`);
    console.log(`POST   /api/books           - Create a new book`);
    console.log(`PUT    /api/books/:id       - Update a book completely`);
    console.log(`PATCH  /api/books/:id       - Partially update a book`);
    console.log(`DELETE /api/books/:id       - Delete a specific book`);
    console.log(`DELETE /api/books           - Delete all books`);
});
