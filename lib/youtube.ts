export function getYoutubeVideoId(videoUrl: string): string | null {
	try {
		const parsed = new URL(videoUrl);
		if (parsed.hostname.includes("youtu.be")) {
			const id = parsed.pathname.replace("/", "").split("/")[0];
			return id || null;
		}
		if (parsed.hostname.includes("youtube.com")) {
			if (parsed.pathname.startsWith("/embed/")) {
				const seg = parsed.pathname.split("/")[2];
				return seg || null;
			}
			return parsed.searchParams.get("v");
		}
		return null;
	} catch {
		return null;
	}
}

export function getYoutubeEmbedUrl(videoUrl: string): string | null {
	const id = getYoutubeVideoId(videoUrl);
	return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function getYoutubeThumbnailUrl(videoUrl: string): string | null {
	const id = getYoutubeVideoId(videoUrl);
	return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
