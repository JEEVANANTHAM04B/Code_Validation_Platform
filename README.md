# Code Guardian AI

You are a Senior Full Stack Software Architect, AI Engineer, and UI/UX Designer.

I want you to build a production-ready AI-powered Code Validation Platform for an organization with 30+ software engineers.

The purpose of this platform is to automatically validate Python and SQL code submissions based on a given programming question, analyze the logic, execute the code safely, identify mistakes, measure complexity, and provide intelligent feedback.

This should not be a simple code runner. It should behave like an AI code reviewer combined with an online coding assessment platform.

====================================================

PROJECT NAME

====================================================

Smart Code Validator

====================================================

OBJECTIVE

====================================================

The system should allow an administrator or reviewer to enter a programming question.

Employees submit their solution.

The backend should:

• Understand the question

• Analyze the submitted code

• Execute it securely

• Compare the code with the question

• Validate correctness

• Detect logical mistakes

• Detect syntax errors

• Suggest improvements

• Calculate complexity

• Estimate difficulty level

• Store everything in history

The website should support Python and SQL.

====================================================

MAIN PAGES

====================================================

1. Dashboard

Display

• Total submissions

• Accepted solutions

• Rejected solutions

• Pending validations

• Average code quality score

• Number of employees

• Language usage (Python vs SQL)

• Recent submissions

• Difficulty distribution

• Success rate

====================================================

2. Code Validator Page

====================================================

Question Text Area

Large textbox

Example

Write a Python program to find duplicate numbers in a list.

----------------------------------------------------

Employee Information

Employee Name

Employee ID

Department

Programming Language

Dropdown

Python

SQL

----------------------------------------------------

Code Editor

Use Monaco Editor

Features

Syntax Highlighting

Auto Complete

Line Numbers

Dark Theme

Copy

Paste

Undo

Redo

====================================================

When user clicks Validate

====================================================

Backend should perform

Step 1

Analyze Question

Detect

Problem Type

Loops

Arrays

String

SQL Join

Aggregation

Searching

Sorting

Functions

Recursion

Database Query

etc.

----------------------------------------------------

Step 2

Analyze Submitted Code

Check

Syntax

Formatting

Naming Convention

Unused Variables

Missing Conditions

Indentation

Bad Practices

Security Issues

====================================================

Step 3

Execute Code Securely

Python

Run in sandbox

Capture Output

Capture Errors

Timeout after 5 seconds

SQL

Execute inside temporary SQLite database

Validate query

Check syntax

Compare expected output

====================================================

Step 4

AI Validation

The AI should compare

Question

Code

Execution Result

Expected Logic

Then determine

Question Understanding

Logic Correctness

Approach Used

Edge Cases

Alternative Methods

====================================================

Step 5

Generate Detailed Report

Show

Overall Score

0-100

Logic Score

Syntax Score

Code Quality

Efficiency

Best Practices

Output Match

Readability

====================================================

Also display

Accepted

or

Rejected

====================================================

If rejected

Explain

What is wrong

Where the mistake occurs

How to fix it

Better approach

Alternative solution

Industry standard solution

====================================================

Step 6

Complexity Analysis

Show

Time Complexity

O(1)

O(log n)

O(n)

O(n log n)

O(n²)

etc.

Space Complexity

O(1)

O(n)

O(n²)

Explain why.

====================================================

Step 7

Difficulty Estimation

Automatically estimate

Easy

Medium

Hard

Expert

Also display

Difficulty Score

Example

82 /100

Reason

Uses recursion

Dynamic Programming

Window Functions

Multiple Joins

etc.

====================================================

Step 8

AI Suggestions

Generate

Cleaner code

Optimized code

Beginner version

Intermediate version

Advanced version

Production-ready version

====================================================

Step 9

Learning Feedback

Explain

Concepts used

Interview tips

Possible interview questions

Common mistakes

Best practices

====================================================

Validation Result UI

====================================================

Display beautiful cards

Accepted

Rejected

Execution Time

Memory Usage

Time Complexity

Space Complexity

Difficulty

AI Score

Logic Score

Syntax Score

Output Match

====================================================

History Page

====================================================

Create a separate History page.

Store every validation permanently in the database.

Each history item should contain

Submission ID

Employee Name

Employee ID

Department

Programming Language

Question

Submitted Code

Validation Result

Accepted or Rejected

Complexity

Difficulty

AI Score

Execution Time

Submission Date

Reviewer Notes (optional)

====================================================

History Features

====================================================

Search

Employee Name

Employee ID

Question

Language

Filter

Accepted

Rejected

Python

SQL

Date

Difficulty

Sort

Newest

Oldest

Highest Score

Lowest Score

Clicking a history item should open a detailed report.

====================================================

Employee Analytics

====================================================

Each employee should have a profile showing

Total submissions

Accepted count

Rejected count

Average score

Average complexity handled

Languages used

Best score

Recent submissions

Improvement trend

====================================================

Leaderboard

====================================================

Create a leaderboard.

Rank employees using

Accepted Rate

Average Score

Problems Solved

Difficulty Solved

====================================================

Backend Requirements

====================================================

Use

Python

FastAPI or Flask

SQLite or PostgreSQL

SQLAlchemy

Monaco Editor

Docker Sandbox for execution

AST Parser

sqlglot

Black Formatter

Pylint

Bandit

Radon

Optional AI Integration

OpenAI API

or

Local Ollama

====================================================

Database Design

====================================================

Tables

Employees

Submissions

ValidationReports

QuestionBank

ExecutionLogs

History

Leaderboard

====================================================

UI Design

====================================================

Modern Dark Theme

Professional

Responsive

Sidebar Navigation

Dashboard Cards

Charts

Progress Bars

Pie Charts

Tables

Code Editor

Animated Result Cards

====================================================

Extra Features

====================================================

Export report to PDF

Export history to Excel

Download validation report

Copy optimized code

Dark/Light mode

Role-based login

Admin

Reviewer

Employee

JWT Authentication

Audit logs

Notifications

====================================================

Architecture

====================================================

Frontend

React + TypeScript + TailwindCSS

Backend

FastAPI

Database

PostgreSQL

ORM

SQLAlchemy

Authentication

JWT

Deployment

Docker

====================================================

Expected Output

====================================================

Generate the complete project including

Project architecture

Folder structure

Database schema

API design

Frontend pages

Backend implementation

Validation engine

Execution engine

AI analysis engine

Complexity analyzer

History module

Authentication

Employee management

Dashboard

Leaderboard

Documentation

README

Docker setup

Environment variables

Testing

The code should be modular, scalable, maintainable, and production-ready, following industry best practices with clean architecture and proper separation of concerns.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://code-sage-validate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/92e2fd22-bb9b-4819-a8aa-71c80ba13e0f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
