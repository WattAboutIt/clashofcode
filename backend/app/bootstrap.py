from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession
from sqlalchemy.orm import sessionmaker

from .models import CodingQuestion


QUESTION_SEED = [
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
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0"))
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0"))
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0"))
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0"))
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0"))
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0"))
    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()"))


async def seed_questions(session_factory: sessionmaker) -> None:
    async with session_factory() as session:  # type: AsyncSession
        count = await session.scalar(select(func.count(CodingQuestion.id)))
        if count:
            return

        session.add_all([CodingQuestion(**question) for question in QUESTION_SEED])
        await session.commit()
