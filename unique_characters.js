function unique_characters(string) {
	return new Set(string).size === string.length;
}

module.exports = unique_characters;
