function renderPost(post) {
	const container = document.getElementById('substack-container');
	const loading = document.getElementById('substack-loading');
	if (!container || !post || !post.title) return;

	const pubDate = new Date(post.pubDate);
	const formattedDate = isNaN(pubDate.getTime()) ? '' : pubDate.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = post.description || post.content || '';
	let textContent = tempDiv.textContent || tempDiv.innerText || '';
	if (textContent.length > 200) {
		textContent = textContent.substring(0, 200).trim() + '...';
	}

	let imageUrl = post.imageUrl || post.thumbnail || '';
	if (!imageUrl) {
		const imgTag = tempDiv.querySelector('img');
		if (imgTag && imgTag.src) {
			imageUrl = imgTag.src;
		}
	}

	const cardHtml = `
		<a href="${post.link}" target="_blank">
			${imageUrl ? `<div class="substack-image" style="background-image: url('${imageUrl}');"></div>` : ''}
			<div class="substack-content">
				<div>
					<span class="substack-badge">Latest Writing</span>
					<h3 class="substack-title">${post.title}</h3>
					<p class="substack-snippet">${textContent}</p>
				</div>
				<div class="substack-footer">
					<span class="substack-date"><i class="fa fa-calendar-o" style="margin-right: 5px;"></i> ${formattedDate}</span>
					<span class="substack-readmore">Read on Substack <i class="fa fa-arrow-right"></i></span>
				</div>
			</div>
		</a>
	`;

	if (loading) loading.style.display = 'none';
	container.innerHTML = cardHtml;
}

function parseRssXml(xmlText) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
	const parseError = xmlDoc.querySelector('parsererror');
	if (parseError) throw new Error('XML parsing failed');

	const item = xmlDoc.querySelector('item');
	if (!item) throw new Error('No items in RSS feed');

	const title = item.querySelector('title')?.textContent || '';
	const link = item.querySelector('link')?.textContent || '';
	const pubDate = item.querySelector('pubDate')?.textContent || '';
	const description = item.querySelector('description')?.textContent || item.getElementsByTagName('content:encoded')?.[0]?.textContent || '';
	const enclosure = item.querySelector('enclosure');
	const imageUrl = enclosure?.getAttribute('url') || '';

	return { title, link, pubDate, description, imageUrl };
}

function parseRss2Json(data) {
	if (data && data.status === 'ok' && data.items && data.items.length > 0) {
		const item = data.items[0];
		return {
			title: item.title,
			link: item.link,
			pubDate: item.pubDate,
			description: item.description || item.content,
			imageUrl: item.thumbnail || ''
		};
	}
	throw new Error('Invalid rss2json response');
}

async function fetchWithTimeout(url, timeoutMs = 4000) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return response;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function fetchSubstackFeed() {
	const container = document.getElementById('substack-container');
	const loading = document.getElementById('substack-loading');
	let rendered = false;

	// 1. Immediately render cached post from localStorage if available
	try {
		const cached = localStorage.getItem('substack_latest_post');
		if (cached) {
			const parsed = JSON.parse(cached);
			if (parsed && parsed.title) {
				renderPost(parsed);
				rendered = true;
			}
		}
	} catch (e) {
		// Ignore storage errors
	}

	// 2. If not rendered yet, attempt to load local backup JSON
	if (!rendered) {
		try {
			const localRes = await fetch('./substack-latest.json');
			if (localRes.ok) {
				const localPost = await localRes.json();
				if (localPost && localPost.title) {
					renderPost(localPost);
					rendered = true;
				}
			}
		} catch (e) {
			// Continue to remote fetch
		}
	}

	// 3. Multi-proxy live fetch with native XML parsing
	const feedUrl = 'https://churchmf.substack.com/feed';
	const encodedFeed = encodeURIComponent(feedUrl);

	const endpoints = [
		{
			url: `https://api.allorigins.win/raw?url=${encodedFeed}`,
			parse: async (res) => parseRssXml(await res.text())
		},
		{
			url: `https://api.codetabs.com/v1/proxy?quest=${encodedFeed}`,
			parse: async (res) => parseRssXml(await res.text())
		},
		{
			url: `https://api.cors.lol/?url=${encodedFeed}`,
			parse: async (res) => parseRssXml(await res.text())
		},
		{
			url: `https://api.rss2json.com/v1/api.json?rss_url=${encodedFeed}`,
			parse: async (res) => parseRss2Json(await res.json())
		}
	];

	for (const endpoint of endpoints) {
		try {
			const res = await fetchWithTimeout(endpoint.url, 4000);
			const livePost = await endpoint.parse(res);
			if (livePost && livePost.title) {
				renderPost(livePost);
				rendered = true;
				try {
					localStorage.setItem('substack_latest_post', JSON.stringify(livePost));
				} catch (e) {}
				return;
			}
		} catch (err) {
			// Try next proxy
		}
	}

	// 4. Final check: if still not rendered, try loading local backup again
	if (!rendered) {
		try {
			const localRes = await fetch('./substack-latest.json');
			if (localRes.ok) {
				const localPost = await localRes.json();
				if (localPost && localPost.title) {
					renderPost(localPost);
					rendered = true;
					return;
				}
			}
		} catch (e) {}
	}

	// 5. Fallback error UI if everything fails
	if (!rendered && loading) {
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

document.addEventListener('DOMContentLoaded', fetchSubstackFeed);
