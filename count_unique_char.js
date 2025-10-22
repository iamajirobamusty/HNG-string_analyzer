function count_unique_char(string) { 
	const charCount = {};

	string.split('').forEach(char => {
		charCount[char] = (charCount[char] || 0) + 1;
	});
	return charCount;
}

module.exports = count_unique_char;
