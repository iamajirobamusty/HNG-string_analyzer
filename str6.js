const express = require('express');
const cors = require('cors');
const palindrome = require('./palindrome');
const unique_char = require('./unique_characters');
const count_unique_char = require('./count_unique_char');
const word_count = require('./word_count');
const { sha256 } = require('js-sha256');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.url} - ${req.method} - ${new Date().toISOString()}`);
    next();
});

let saved_strings = [];

// POST /strings
app.post('/strings', (req, res) => {
    try {
        const { value } = req.body;

        if (!value || typeof value !== 'string') {
            return res.status(422).json({  // 422 for missing/invalid type
                success: false,
                message: 'Invalid request body or "value" field'
            });
        }

        // Check for duplicate
        const exist = saved_strings.some(item => item.value.toLowerCase() === value.toLowerCase());
        if (exist) {
            return res.status(409).json({  // Correct status for duplicates
                success: false,
                message: "String already exists in the system"
            });
        }

        const hash = sha256(value);
        let pal = palindrome(value);  // Ensure palindrome function is case-insensitive
        let count = word_count(value);
        let unique = unique_char(value);
        if (!unique) unique = count_unique_char(value);

        const data = {
            id: hash,
            value,
            properties: {
                length: value.length,
                is_palindrome: pal,
                unique_characters: Object.keys(unique).length,
                word_count: count,
                sha256_hash_value: hash,  // fix typo: sha256_hash_vale → sha256_hash_value
                character_frequency_map: unique,
                created_at: new Date().toISOString()
            }
        };

        saved_strings.push(data);
        res.status(201).json(data); // 201 for success
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// GET /strings/filter-by-natural-language
app.get('/strings/filter-by-natural-language', (req, res) => {
    const { query } = req.query;

    if (!query) return res.status(400).json({ success: false, message: "Missing 'query' parameter" });
    if (!saved_strings.length) return res.status(404).json({ success: false, message: "No strings saved in the system" });

    const lowerQuery = query.toLowerCase();
    let filters = {};

    if (lowerQuery.includes('palindromic')) filters.is_palindrome = true;
    if (lowerQuery.includes('single word')) filters.word_count = 1;
    if (lowerQuery.includes('longer than')) {
        const match = lowerQuery.match(/longer than (\d+)/);
        if (match) filters.min_length = parseInt(match[1]) + 1;
    }
    if (lowerQuery.includes('containing the letter')) {
        const match = lowerQuery.match(/containing the letter (\w)/);
        if (match) filters.contains_character = match[1].toLowerCase();
    }

    let result = [...saved_strings];

    if (filters.is_palindrome !== undefined) result = result.filter(item => item.properties.is_palindrome === filters.is_palindrome);
    if (filters.word_count !== undefined) result = result.filter(item => item.properties.word_count === filters.word_count);
    if (filters.min_length !== undefined) result = result.filter(item => item.properties.length >= filters.min_length);
    if (filters.contains_character) result = result.filter(item => item.value.toLowerCase().includes(filters.contains_character));

    if (!result.length) return res.status(404).json({ success: false, message: "No strings match the natural language query", interpreted_query: { original: query, parsed_filters: filters } });

    res.status(200).json({ success: true, count: result.length, data: result, interpreted_query: { original: query, parsed_filters: filters } });
});

// GET /strings/:string_value
app.get('/strings/:string_value', (req, res) => {
    const { string_value } = req.params;

    if (!saved_strings.length) {
        return res.status(404).json({ success: false, message: "No strings saved in the system" });
    }

    const data = saved_strings.find(item => item.value.toLowerCase() === string_value.toLowerCase());
    if (!data) {
        return res.status(404).json({ success: false, message: "String does not exist in the system" });
    }

    res.status(200).json(data);
});

// GET /strings with query params
app.get('/strings', (req, res) => {
    const { is_palindrome, min_length, max_length, word_count, contains_character } = req.query;
    let result = [...saved_strings];

    if (is_palindrome !== undefined) result = result.filter(item => item.properties.is_palindrome === (is_palindrome === 'true'));
    if (min_length) result = result.filter(item => item.properties.length >= parseInt(min_length));
    if (max_length) result = result.filter(item => item.properties.length <= parseInt(max_length));
    if (word_count) result = result.filter(item => item.properties.word_count === parseInt(word_count));
    if (contains_character) result = result.filter(item => item.value.toLowerCase().includes(contains_character.toLowerCase()));

    if (!result.length) {
        return res.status(404).json({ success: false, message: "No strings match the filters" });
    }

    res.status(200).json({ success: true, count: result.length, result });
});

// DELETE /strings/:string_value
app.delete('/strings/:string_value', (req, res) => {
    const { string_value } = req.params;

    if (!saved_strings.length) return res.status(404).json({ success: false, message: "No strings saved in the system" });

    const index = saved_strings.findIndex(item => item.value.toLowerCase() === string_value.toLowerCase());
    if (index === -1) return res.status(404).json({ success: false, message: "String does not exist in the system" });

    saved_strings.splice(index, 1);
    return res.status(204);
});

// Start server
app.listen(3000, () => console.log("Server running at localhost:3000"));
