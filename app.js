let currentPage = 1;
let pageSize = 6;
let allNews = [];
let filteredNews = [];
let currentCategory = 'all';
let isAdmin = false;
let editingArticle = null;


const newsBox = document.getElementById("newsBox");
const spinner = document.getElementById("spinner");
const darkModeToggle = document.getElementById("darkModeToggle");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const pageSizeSelect = document.getElementById("pageSize");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');


document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode();
    fetchNews();
    setupEventListeners();
    
    // Initialize admin mode
    const adminToggle = document.getElementById('adminToggle');
    if (adminToggle) {
        isAdmin = adminToggle.checked;
    }

    // Initialize Bootstrap modal
    if (editModal) {
        window.editModalInstance = new bootstrap.Modal(editModal);
    }
});

// Event Listeners
function setupEventListeners() {
    darkModeToggle.addEventListener("change", toggleDarkMode);
    searchInput.addEventListener("input", handleSearch);
    categoryFilter.addEventListener("change", handleCategoryChange);
    pageSizeSelect.addEventListener("change", handlePageSizeChange);
    prevPageBtn.addEventListener("click", () => changePage(-1));
    nextPageBtn.addEventListener("click", () => changePage(1));
    editForm.addEventListener('submit', handleEditSubmit);
    document.getElementById('adminToggle').addEventListener('change', toggleAdminMode);
    startDate.addEventListener('change', handleDateFilter);
    endDate.addEventListener('change', handleDateFilter);
}


function initializeDarkMode() {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (storedDarkMode || prefersDarkMode) {
        document.body.classList.add("dark-mode");
        darkModeToggle.checked = true;
    }
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem('darkMode', document.body.classList.contains("dark-mode"));
}


function toggleAdminMode(e) {
    isAdmin = e.target.checked;
    console.log('Admin mode:', isAdmin);
    updateNewsDisplay();
}

function updateNewsDisplay() {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageNews = filteredNews.slice(startIndex, endIndex);
    const maxPage = Math.ceil(filteredNews.length / pageSize);

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === maxPage;
    pageInfo.textContent = `Page ${currentPage} of ${maxPage}`;

    const newsHTML = pageNews.map(article => `
        <div class="newsCard">
            <div class="imageWrapper">
                <img src="${article.urlToImage || 'https://placehold.co/400x320'}"
                    class="thumbnail" alt="News Image"
                    onerror="this.src='https://placehold.co/400x320'">
            </div>
            <div class="card-body">
                <span class="category-badge">${article.category}</span>
                <h5 class="card-title">${article.title}</h5>
                <h6 class="card-author">Author: ${article.author || 'Unknown'}</h6>
                <p class="card-text">${article.description || ''}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <a target="_blank" href="${article.url}" class="btn btn-primary">Read more</a>
                    ${isAdmin ? `
                        <button class="btn btn-secondary" 
                                onclick="handleEditClick('${article.id}')"
                                type="button">
                            Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');

    newsBox.innerHTML = newsHTML;
}


window.handleEditClick = function(articleId) {
    editingArticle = filteredNews.find(article => article.id === articleId);
    if (editingArticle) {
        document.getElementById('editTitle').value = editingArticle.title;
        document.getElementById('editDescription').value = editingArticle.description || '';
        document.getElementById('editAuthor').value = editingArticle.author || '';
        document.getElementById('editCategory').value = editingArticle.category;
        
        if (window.editModalInstance) {
            window.editModalInstance.show();
        }
    }
};

// Handle edit form submission
function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!editingArticle) return;

    editingArticle.title = document.getElementById('editTitle').value;
    editingArticle.description = document.getElementById('editDescription').value;
    editingArticle.author = document.getElementById('editAuthor').value;
    editingArticle.category = document.getElementById('editCategory').value;

    const index = allNews.findIndex(article => article.id === editingArticle.id);
    if (index !== -1) {
        allNews[index] = { ...editingArticle };
    }

    if (window.editModalInstance) {
        window.editModalInstance.hide();
    }

    filterNews();
    editingArticle = null;
}

// Fetch News
async function fetchNews() {
    try {
        spinner.style.display = "block";
        const sources = {
            business: 'https://saurav.tech/NewsAPI/top-headlines/category/business/us.json',
            technology: 'https://saurav.tech/NewsAPI/top-headlines/category/technology/us.json',
            entertainment: 'https://saurav.tech/NewsAPI/top-headlines/category/entertainment/us.json',
            sports: 'https://saurav.tech/NewsAPI/top-headlines/category/sports/us.json',
            science: 'https://saurav.tech/NewsAPI/top-headlines/category/science/us.json',
            health: 'https://saurav.tech/NewsAPI/top-headlines/category/health/us.json'
        };

        // Fetch general news
        const generalResponse = await fetch('https://saurav.tech/NewsAPI/everything/cnn.json');
        const generalData = await generalResponse.json();
        
        allNews = generalData.articles.map((article, index) => ({
            ...article,
            id: `general-${index}`,
            category: 'general'
        }));

        // Fetch category-specific news
        for (const [category, url] of Object.entries(sources)) {
            const response = await fetch(url);
            const data = await response.json();
            const categoryNews = data.articles.map((article, index) => ({
                ...article,
                id: `${category}-${index}`,
                category: category
            }));
            allNews = [...allNews, ...categoryNews];
        }

        filteredNews = [...allNews];
        updateNewsDisplay();
        spinner.style.display = "none";
    } catch (error) {
        console.error('Error fetching news:', error);
        spinner.style.display = "none";
    }
}

// Filtering Functions
function handleSearch() {
    filterNews();
}

function handleCategoryChange(e) {
    currentCategory = e.target.value;
    filterNews();
}

function handleDateFilter() {
    filterNews();
}

function filterNews() {
    const searchTerm = searchInput.value.toLowerCase();
    const start = startDate.value ? new Date(startDate.value) : null;
    const end = endDate.value ? new Date(endDate.value) : null;
    
    filteredNews = allNews.filter(article => {
        const matchesSearch = 
            article.title.toLowerCase().includes(searchTerm) ||
            article.description?.toLowerCase().includes(searchTerm) ||
            article.author?.toLowerCase().includes(searchTerm);
            
        const matchesCategory = 
            currentCategory === 'all' || 
            article.category === currentCategory;

        const articleDate = new Date(article.publishedAt);
        const matchesDate = (!start || articleDate >= start) && 
                           (!end || articleDate <= end);
            
        return matchesSearch && matchesCategory && matchesDate;
    });
    
    currentPage = 1;
    updateNewsDisplay();
}

// Pagination
function handlePageSizeChange(e) {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    updateNewsDisplay();
}

function changePage(delta) {
    const maxPage = Math.ceil(filteredNews.length / pageSize);
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= maxPage) {
        currentPage = newPage;
        updateNewsDisplay();
    }
}

// Set copyright year
document.getElementById('footerText').innerHTML = `Copyright &copy; ${new Date().getFullYear()} Daily News Hub. All rights reserved.`;