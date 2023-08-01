document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('searchForm');
    const messageList = document.getElementById('messageList');
    const prevPageButton = document.getElementById('prevPageButton');
    const nextPageButton = document.getElementById('nextPageButton');
    const currentPageSpan = document.getElementById('currentPage');
    const themeToggleButton = document.getElementById('themeToggleButton');

    let currentPage = 1;
    const resultsPerPage = 10;
    let totalResults = 0;
    let searchResults = [];

    function isValidURL(str) {
        const pattern = new RegExp(
            '^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // IP address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$',
            'i'
        );
        return !!pattern.test(str);
    }

    function createSearchResultItemHTML(result) {
        let listItemHTML = '<li class="search-result">';
        listItemHTML += `<div class="result-section"><span class="result-label">Message ID:</span> ${result.message_id}</div>`;
        listItemHTML += `<div class="result-section"><span class="result-label">Date:</span> ${result.date}</div>`;
        listItemHTML += `<div class="result-section"><span class="result-label">Sender:</span> ${result.sender}</div>`;
        listItemHTML += `<div class="result-section"><span class="result-label">Sender Type:</span> ${result.sender_type}</div>`;
        listItemHTML += `<div class="result-section"><span class="result-label">Content:</span> ${result.content}</div>`;
        listItemHTML += `<div class="result-section"><span class="result-label">Content Beautified:</span> ${result.content_beautified}</div>`;
        listItemHTML += '<div class="result-section"><span class="result-label">In Message URLs:</span><ul>';
        for (const url of result.in_message_urls) {
            const urls = url.split(' ').filter(u => isValidURL(u));
            for (const u of urls) {
                listItemHTML += `<a href="${u}" target="_blank">${u}</a>`;
            }
        }
        listItemHTML += '</ul></div>';
        listItemHTML += '<div class="result-section"><span class="result-label">Attached Files:</span><ul>';
        for (const file of result.attached_files) {
            listItemHTML += `<li>${file}</li>`;
        }
        listItemHTML += '</ul></div>';
        listItemHTML += `<div class="result-section"><a href="${result.post_url}" target="_blank" class="view-post-link">View Original Post</a></div>`;
        listItemHTML += '</li>';
        return listItemHTML;
    }

    function updateDisplayedResults() {
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = Math.min(startIndex + resultsPerPage, totalResults);

        let listItemsHTML = '';
        for (let i = startIndex; i < endIndex; i++) {
            const result = searchResults[i];
            listItemsHTML += createSearchResultItemHTML(result);
        }

        messageList.innerHTML = listItemsHTML;
        currentPageSpan.textContent = `Page ${currentPage}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = endIndex >= totalResults;

        const viewPostLinks = messageList.getElementsByClassName('view-post-link');
        for (const link of viewPostLinks) {
            link.addEventListener('click', handleViewOriginalPost);
        }
    }

    async function performSearch(searchQuery) {
        try {
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: searchQuery })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch search results.');
            }

            searchResults = await response.json();
            totalResults = searchResults.length;
            currentPage = 1;

            if (totalResults === 0) {
                messageList.innerHTML = '<li>No results found.</li>';
            } else {
                updateDisplayedResults();

                if (searchResults[0].post_url) {
                    const postUrl = searchResults[0].post_url;
                    embedTelegramWidget(postUrl);
                }
            }
        } catch (error) {
            console.error('Error fetching search results:', error);
            messageList.innerHTML = '<li>Error fetching search results. Please try again later.</li>';
        }
    }

    function handleViewOriginalPost(event) {
        const postUrl = event.currentTarget.getAttribute('href');
        window.open(postUrl, '_blank');
        event.preventDefault();
    }

    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const searchQuery = document.getElementById('searchQuery').value.trim();

        if (searchQuery === '') {
            return;
        }

        await performSearch(searchQuery);
    });

    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateDisplayedResults();
        }
    });

    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(totalResults / resultsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateDisplayedResults();
        }
    });

    themeToggleButton.addEventListener('click', () => {
        toggleTheme();
    });

    function toggleTheme() {
        const body = document.body;
        body.classList.toggle('dark-mode');
        updateThemeButton();
    }

    function updateThemeButton() {
        const body = document.body;
        const themeToggleButton = document.getElementById('themeToggleButton');
        if (body.classList.contains('dark-mode')) {
            themeToggleButton.textContent = 'Switch to Light Mode';
        } else {
            themeToggleButton.textContent = 'Switch to Dark Mode';
        }
    }

    updateThemeButton();
});
