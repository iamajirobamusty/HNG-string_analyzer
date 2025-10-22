function word_count(string) {
	const words = string.trim().split(/\s+/);
	return words.filter(word => word.length > 0).length;
}

module.exports = word_count;
