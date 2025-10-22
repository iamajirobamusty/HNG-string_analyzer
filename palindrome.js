function palindrome(string) {
	return string === string.split('').reverse().join('');
}

module.exports = palindrome
