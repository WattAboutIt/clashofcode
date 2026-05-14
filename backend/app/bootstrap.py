from sqlalchemy import func, inspect, select, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession
from sqlalchemy.orm import sessionmaker

from .models import CodingQuestion


QUESTION_SEED = [
{
    "title": "Regular Expression Matching",
    "difficulty": "hard",
    "description": """\
Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where:

- '.' Matches any single character.
- '*' Matches zero or more of the preceding element.

Return a boolean indicating whether the matching covers the entire input string (not partial).
    """,
    "test_cases": [
        {"input": {"s": "aa", "p": "a"}, "expected": False},
        {"input": {"s": "aa", "p": "a*"}, "expected": True},
        {"input": {"s": "ab", "p": ".*"}, "expected": True},
        {"input": {"s": "aab", "p": "c*a*b"}, "expected": True},
        {"input": {"s": "mississippi", "p": "mis*is*p*."}, "expected": False},
    ],
    "examples": [
        {
            "input": "s = 'aa', p = 'a'",
            "output": False,
            "explanation": "'a' does not match the entire string 'aa'."
        },
        {
            "input": "s = 'aa', p = 'a*'",
            "output": True,
            "explanation": "'*' means zero or more of the preceding element 'a'. By repeating 'a' once, it becomes 'aa'."
        },
        {
            "input": "s = 'ab', p = '.*'",
            "output": True,
            "explanation": "'.*' means zero or more of any character '.', which matches 'ab'."
        },
    ],
    "constraints": """\
1 <= s.length <= 20
1 <= p.length <= 20
s contains only lowercase English letters.
p contains only lowercase English letters, '.', and '*'.
It is guaranteed for each appearance of '*', there will be a previous valid character to match.\
    """,
    "points": 350,
    "starter_code": "def isMatch(self, s: str, p: str) -> bool:\n    pass"
    },
    {
    "title": "String to Integer (atoi)",
    "difficulty": "medium",
    "description": """\
Implement the myAtoi(string s) function, which converts a string to a 32-bit signed integer.

The algorithm for myAtoi(string s) is as follows:
1. Whitespace: Ignore any leading whitespace (" ").
2. Signedness: Determine the sign by checking if the next character is '-' or '+', assuming positivity if neither present.
3. Conversion: Read the integer by skipping leading zeros until a non-digit character is encountered or the end of the string is reached. If no digits were read, then the result is 0.
4. Rounding: If the integer is out of the 32-bit signed integer range [-2^31, 2^31 - 1], round the integer to remain in the range. Specifically, integers less than -2^31 should be rounded to -2^31, and integers greater than 2^31 - 1 should be rounded to 2^31 - 1.

Return the integer as the final result.
    """,
    "test_cases": [
        {"input": {"s": "42"}, "expected": 42},
        {"input": {"s": " -042"}, "expected": -42},
        {"input": {"s": "1337c0d3"}, "expected": 1337},
        {"input": {"s": "0-1"}, "expected": 0},
        {"input": {"s": "words and 987"}, "expected": 0},
        {"input": {"s": "-91283472332"}, "expected": -2147483648},
        {"input": {"s": "21474836460"}, "expected": 2147483647},
    ],
    "examples": [
        {
            "input": "s = '42'",
            "output": 42,
            "explanation": "No leading whitespace or sign, '42' is read in directly."
        },
        {
            "input": "s = ' -042'",
            "output": -42,
            "explanation": "Leading whitespace ignored, '-' sets negative sign, '042' read with leading zeros ignored."
        },
        {
            "input": "s = '1337c0d3'",
            "output": 1337,
            "explanation": "'1337' is read in; reading stops at the non-digit character 'c'."
        },
        {
            "input": "s = '0-1'",
            "output": 0,
            "explanation": "'0' is read in; reading stops at '-' since it is a non-digit character."
        },
        {
            "input": "s = 'words and 987'",
            "output": 0,
            "explanation": "Reading stops immediately at 'w' which is a non-digit character, result is 0."
        },
    ],
    "constraints": """\
0 <= s.length <= 200
s consists of English letters (lower-case and upper-case), digits (0-9), ' ', '+', '-', and '.'.\
    """,
    "points": 220,
    "starter_code": "def myAtoi(self, s: str) -> int:\n    pass"
},
    {
    "title": "Zigzag Conversion",
    "difficulty": "medium",
    "description": """\
The string "PAYPALISHIRING" is written in a zigzag pattern on a given number of rows like this:

P   A   H   N
A P L S I I G
Y   I   R

And then read line by line: "PAHNAPLSIIGYIR"
Write the code that will take a string and make this conversion given a number of rows.
    """,
    "test_cases": [
        {"input": {"s": "PAYPALISHIRING", "numRows": 3}, "expected": "PAHNAPLSIIGYIR"},
        {"input": {"s": "PAYPALISHIRING", "numRows": 4}, "expected": "PINALSIGYAHRPI"},
        {"input": {"s": "A", "numRows": 1}, "expected": "A"},
    ],
    "examples": [
        {
            "input": "s = 'PAYPALISHIRING', numRows = 3",
            "output": "PAHNAPLSIIGYIR",
            "explanation": "Characters placed in zigzag across 3 rows, read line by line."
        },
        {
            "input": "s = 'PAYPALISHIRING', numRows = 4",
            "output": "PINALSIGYAHRPI",
            "explanation": "Characters placed in zigzag across 4 rows: P/I/N | A/L/S/I/G | Y/A/H/R | P/I, read line by line."
        },
        {
            "input": "s = 'A', numRows = 1",
            "output": "A",
            "explanation": "Single character with one row stays the same."
        },
    ],
    "constraints": """\
1 <= s.length <= 1000
s consists of English letters (lower-case and upper-case), ',' and '.'.
1 <= numRows <= 1000\
    """,
    "points": 200,
    "starter_code": "def convert(self, s: str, numRows: int) -> str:\n    pass"
    },
    {
    "title": "Longest Palindromic Substring",
    "difficulty": "medium",
    "description": """\
Given a string s, return the longest palindromic substring in s.
    """,
    "test_cases": [
        {"input": {"s": "babad"}, "expected": "bab"},
        {"input": {"s": "cbbd"}, "expected": "bb"},
        {"input": {"s": "a"}, "expected": "a"},
        {"input": {"s": "racecar"}, "expected": "racecar"},
    ],
    "examples": [
        {
            "input": "s = 'babad'",
            "output": "bab",
            "explanation": "'aba' is also a valid answer."
        },
        {
            "input": "s = 'cbbd'",
            "output": "bb",
            "explanation": "'bb' is the longest palindromic substring."
        },
    ],
    "constraints": """\
1 <= s.length <= 1000
s consist of only digits and English letters.\
    """,
    "points": 220,
    "starter_code": "def longestPalindrome(self, s: str) -> str:\n    pass"
},
    {
    "title": "Median of Two Sorted Arrays",
    "difficulty": "hard",
    "description": """\
        Given two sorted arrays nums1 and nums2 of size m and n respectively, 
        return the median of the two sorted arrays.
        The overall run time complexity should be O(log (m+n)).
    """,
    "test_cases": [
        {"input": {"nums1": [1, 3], "nums2": [2]}, "expected": 2.00000},
        {"input": {"nums1": [1, 2], "nums2": [3, 4]}, "expected": 2.50000},
    ],
    "examples": [
        {
            "input": "nums1 = [1,3], nums2 = [2]",
            "output": 2.00000,
            "explanation": "merged array = [1,2,3] and median is 2."
        },
        {
            "input": "nums1 = [1,2], nums2 = [3,4]",
            "output": 2.50000,
            "explanation": "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5."
        },
    ],
    "constraints": """\
        0 <= m <= 1000
        0 <= n <= 1000
        1 <= m + n <= 2000
        -10^6 <= nums1[i], nums2[i] <= 10^6
    """,
    "points": 300,
    "starter_code": "def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:\n    pass"
    },
    {
    "title": "Longest Substring Without Repeating Characters",
    "difficulty": "medium",
    "description": """
       Given a string s, find the length of the longest substring without duplicate characters.
        """,
    "test_cases": [
            {"input": {"s": "abcabcbb"}, "expected": 3},
            {"input": {"s": "bbbbb"}, "expected": 1},
            {"input": {"s": "pwwkew"}, "expected": 3},
        ],
    "examples": [
        {
            "input": "s = 'abcabcbb'",
            "output": 3,
            "explanation": "abc, bca, cab are the longest substrings without repeating characters."
        },
        {
            "input": "s = 'bbbbb'",
            "output": 1,
            "explanation": "b is the longest substring without repeating characters."
        },
        {
            "input": "s = 'pwwkew'",
            "output": 3,
            "explanation": "wke is the longest substring without repeating characters."
        }
        ],
    "constraints": "1 <= s.length <= 5 * 10^4 \n s contains only English letters, digits, symbols and spaces.",
    "points": 200,
    "starter_code": "def lengthOfLongestSubstring(self, s: str) -> int:\n    pass"
    },
    {
        "title": "Roman to Integer",
        "difficulty": "easy",
        "description": """
        Given a roman numeral, convert it to an integer.
        
        Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M.

        Symbol       Value
        I            1
        V            5
        X            10
        L            50
        C            100
        D            500
        M            1000

        For example, 2 is written as II in Roman numeral, just two ones added together. 12 is written as XII, which is simply X + II. The number 27 is written as XXVII, which is XX + V + II.
        
        Roman numerals are usually written largest to smallest from left to right. However, the numeral for four is not IIII. Instead, the number four is written as IV. Because the one is before the five we subtract it making four. The same principle applies to the number nine, which is written as IX. There are six instances where subtraction is used:

            - I can be placed before V (5) and X (10) to make 4 and 9.
            - X can be placed before L (50) and C (100) to make 40 and 90.
            - C can be placed before D (500) and M (1000) to make 400 and 900.
        """,
        "test_cases": [
            {"input": {"s": "III"}, "expected": 3},
            {"input": {"s": "LVIII"}, "expected": 58},
            {"input": {"s": "MCMXCIV"}, "expected": 1994},
        ],
        "examples": [
        {
            "input": "s = 'III'",
            "output": 3,
            "explanation": "III = 3."
        },
        {
            "input": "s = 'LVIII'",
            "output": 58,
            "explanation": "L = 50, V= 5, III = 3."
        },
        {
            "input": "s = 'MCMXCIV'",
            "output": 1994,
            "explanation": "M = 1000, CM = 900, XC = 90 and IV = 4."
        }
        ],
        "constraints": "1 <= s.length <= 15 \n s contains only the characters ('I', 'V', 'X', 'L', 'C', 'D', 'M'). \n It is guaranteed that s is a valid roman numeral in the range [1, 3999]",
        "points": 100,
        "starter_code": "def romanToInt(self, s: str) -> int:\n    pass"
    },
    {
        "title": "Two Sum Arena",
        "difficulty": "easy",
        "description": (
            "Given an array of integers and a target value, return the indexes of "
            "the two numbers that add up to the target.\n\n"
            "You may assume exactly one valid answer exists, and you may not use "
            "the same element twice."
        ),
        "test_cases": [
            {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1]},
            {"input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2]},
        ],
        "examples": [
            {
                "input": "nums = [2,7,11,15], target = 9",
                "output": "[0,1]",
                "explanation": "2 + 7 equals 9.",
            }
        ],
        "constraints": "2 <= nums.length <= 10^4, -10^9 <= nums[i], target <= 10^9",
        "points": 100,
        "starter_code": (
            "def two_sum(nums, target):\n"
            "    # Return the indices of the two values that sum to target.\n"
            "    pass\n"
        ),
    },
    {
        "title": "Valid Parentheses Relay",
        "difficulty": "easy",
        "description": (
            "Given a string containing only parentheses characters, determine "
            "whether the input string is valid."
        ),
        "test_cases": [
            {"input": {"s": "()[]{}"}, "expected": True},
            {"input": {"s": "(]"}, "expected": False},
        ],
        "examples": [
            {
                "input": 's = "()[]{}"',
                "output": "true",
                "explanation": "Every opening bracket is closed in the correct order.",
            }
        ],
        "constraints": "1 <= s.length <= 10^4",
        "points": 120,
        "starter_code": (
            "def is_valid_parentheses(s):\n"
            "    # Return True when brackets are balanced.\n"
            "    pass\n"
        ),
    },
    {
        "title": "Sliding Window Sprint",
        "difficulty": "medium",
        "description": (
            "Given an array of integers and a window size k, return the maximum "
            "value in each sliding window."
        ),
        "test_cases": [
            {"input": {"nums": [1, 3, -1, -3, 5, 3, 6, 7], "k": 3}, "expected": [3, 3, 5, 5, 6, 7]},
            {"input": {"nums": [1], "k": 1}, "expected": [1]},
        ],
        "examples": [
            {
                "input": "nums = [1,3,-1,-3,5,3,6,7], k = 3",
                "output": "[3,3,5,5,6,7]",
                "explanation": "Track the current best candidate as the window moves.",
            }
        ],
        "constraints": "1 <= nums.length <= 10^5, 1 <= k <= nums.length",
        "points": 220,
        "starter_code": (
            "def max_sliding_window(nums, k):\n"
            "    # Return the max value for every window of size k.\n"
            "    pass\n"
        ),
    },
    {
        "title": "Clone Graph Duel",
        "difficulty": "medium",
        "description": (
            "You are given a reference to a node in a connected undirected graph. "
            "Return a deep copy of the graph."
        ),
        "test_cases": [
            {"input": {"adjList": [[2, 4], [1, 3], [2, 4], [1, 3]]}, "expected": "[deep-copy]"},
            {"input": {"adjList": [[]]}, "expected": "[deep-copy]"},
        ],
        "examples": [
            {
                "input": "adjList = [[2,4],[1,3],[2,4],[1,3]]",
                "output": "A separate graph with the same connections",
                "explanation": "Each node and edge should be recreated.",
            }
        ],
        "constraints": "0 <= number of nodes <= 100",
        "points": 250,
        "starter_code": (
            "def clone_graph(node):\n"
            "    # Return a deep copy of the graph.\n"
            "    pass\n"
        ),
    },
    {
        "title": "Merge K Lists Gauntlet",
        "difficulty": "hard",
        "description": (
            "Merge k sorted linked lists and return the merged sorted list. "
            "The overall runtime should scale well with the total number of nodes."
        ),
        "test_cases": [
            {"input": {"lists": [[1, 4, 5], [1, 3, 4], [2, 6]]}, "expected": [1, 1, 2, 3, 4, 4, 5, 6]},
            {"input": {"lists": []}, "expected": []},
        ],
        "examples": [
            {
                "input": "lists = [[1,4,5],[1,3,4],[2,6]]",
                "output": "[1,1,2,3,4,4,5,6]",
                "explanation": "Combine all lists while preserving sorted order.",
            }
        ],
        "constraints": "0 <= k <= 10^4, total nodes <= 10^4",
        "points": 350,
        "starter_code": (
            "def merge_k_lists(lists):\n"
            "    # Merge all sorted linked lists into one sorted list.\n"
            "    pass\n"
        ),
    },
    {
        "title": "Word Ladder Marathon",
        "difficulty": "hard",
        "description": (
            "Given two words and a dictionary, return the length of the shortest "
            "transformation sequence from beginWord to endWord."
        ),
        "test_cases": [
            {
                "input": {
                    "beginWord": "hit",
                    "endWord": "cog",
                    "wordList": ["hot", "dot", "dog", "lot", "log", "cog"],
                },
                "expected": 5,
            },
            {
                "input": {
                    "beginWord": "hit",
                    "endWord": "cog",
                    "wordList": ["hot", "dot", "dog", "lot", "log"],
                },
                "expected": 0,
            },
        ],
        "examples": [
            {
                "input": 'beginWord = "hit", endWord = "cog"',
                "output": "5",
                "explanation": "One shortest path is hit -> hot -> dot -> dog -> cog.",
            }
        ],
        "constraints": "1 <= word length <= 10, dictionary size <= 5000",
        "points": 400,
        "starter_code": (
            "def ladder_length(begin_word, end_word, word_list):\n"
            "    # Return the shortest transformation sequence length.\n"
            "    pass\n"
        ),
    },
]


async def ensure_legacy_schema(conn: AsyncConnection) -> None:
    existing_columns = await conn.run_sync(
        lambda sync_conn: {
            column["name"] for column in inspect(sync_conn).get_columns("users")
        }
    )
    created_at_default = (
        "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        if conn.dialect.name == "sqlite"
        else "TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()"
    )
    legacy_columns = {
        "games_played": "INTEGER NOT NULL DEFAULT 0",
        "wins": "INTEGER NOT NULL DEFAULT 0",
        "losses": "INTEGER NOT NULL DEFAULT 0",
        "total_points": "INTEGER NOT NULL DEFAULT 0",
        "current_streak": "INTEGER NOT NULL DEFAULT 0",
        "best_streak": "INTEGER NOT NULL DEFAULT 0",
        "created_at": created_at_default,
    }

    for column_name, column_definition in legacy_columns.items():
        if column_name not in existing_columns:
            await conn.execute(
                text(f"ALTER TABLE users ADD COLUMN {column_name} {column_definition}")
            )


async def seed_questions(session_factory: sessionmaker) -> None:
    async with session_factory() as session:  # type: AsyncSession
        count = await session.scalar(select(func.count(CodingQuestion.id)))
        if count:
            return

        session.add_all([CodingQuestion(**question) for question in QUESTION_SEED])
        await session.commit()
