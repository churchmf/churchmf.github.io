async function fetchSubstackFeed() {
	const container = document.getElementById('substack-container');
	const loading = document.getElementById('substack-loading');
	const feedUrl = 'https://churchmf.substack.com/feed';
	const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;

	try {
		const response = await fetch(apiUrl);
		if (!response.ok) throw new Error('Failed to fetch feed');
		const data = await response.json();
		
		if (data.status === 'ok' && data.items && data.items.length > 0) {
			// Hide loading element
			if (loading) loading.style.display = 'none';
			
			// Get the latest post
			const latestPost = data.items[0];
			
			// Format publication date
			const pubDate = new Date(latestPost.pubDate);
			const formattedDate = pubDate.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});

			// Create plain text excerpt
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = latestPost.description || latestPost.content;
			let textContent = tempDiv.textContent || tempDiv.innerText || "";
			if (textContent.length > 200) {
				textContent = textContent.substring(0, 200).trim() + '...';
			}

			// Attempt to get thumbnail image
			let imageUrl = latestPost.thumbnail || '';
			if (!imageUrl) {
				const imgTag = tempDiv.querySelector('img');
				if (imgTag && imgTag.src) {
					imageUrl = imgTag.src;
				}
			}

			const cardHtml = `
				<a href="${latestPost.link}" target="_blank">
					${imageUrl ? `<div class="substack-image" style="background-image: url('${imageUrl}');"></div>` : ''}
					<div class="substack-content">
						<div>
							<span class="substack-badge">Latest Writing</span>
							<h3 class="substack-title">${latestPost.title}</h3>
							<p class="substack-snippet">${textContent}</p>
						</div>
						<div class="substack-footer">
							<span class="substack-date"><i class="fa fa-calendar-o" style="margin-right: 5px;"></i> ${formattedDate}</span>
							<span class="substack-readmore">Read on Substack <i class="fa fa-arrow-right"></i></span>
						</div>
					</div>
				</a>
			`;
			
			if (container) container.innerHTML = cardHtml;
		} else {
			throw new Error('No items found in feed');
		}
	} catch (error) {
		console.error('Error fetching Substack feed:', error);
		if (loading) {
			loading.innerHTML = `
				<div style="padding: 1em 0;">
					<i class="fa fa-exclamation-circle" style="font-size: 2em; color: #ff3b30; margin-bottom: 10px; display: block;"></i>
					<span style="color: #333; font-weight: bold; display: block; margin-bottom: 8px;">Unable to load latest post</span>
					<p style="color: #666; margin: 0 0 15px 0; font-size: 0.95em;">You can view the latest posts directly on my Substack page.</p>
					<a href="https://churchmf.substack.com" target="_blank" class="button" style="padding: 0.6em 1.2em; font-size: 0.9em; background: #ff6719; color: white; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold; border: none; box-shadow: 0 2px 5px rgba(255,103,25,0.2);">Visit My Substack</a>
				</div>
			`;
		}
	}
}

document.addEventListener('DOMContentLoaded', fetchSubstackFeed);
