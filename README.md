v3grid
======

A virtual datagrid in JavaScript.

What is v3grid?
---
It is a datagrid/table implementation written in JavaScript. Why is it special? Keep reading!

What is 'v3' in the name?
---

VirtualGrid seemed a bit too simple, I had to come up with a good name. It is **V**irtual in **3** different ways: horizontally, vertically and the data too, hence the name.

Design Goals
---
These are the goals (properties) I had in mind when I started working on v3grid:

* Virtual in both horizontal (columns) and vertical (rows) directions
* Virtual Data - Should handle infinite amount of data
* Mobile device support (iOS, Android) - Smooth scrolling, Touch handling
* Modular - each module/class is kept small, you can pick what features you want
* Framework Independent - 
* I won't say 'lightweight', because each and every JS lib out there claims it's lightweight

Features
---
Sorry for the repetition here.

- Virtual columns, rows - it only shows the cells that are visible (almost)
- Virtual Data - you give it a getData(row, col) function and it renders your data
- Custom ItemRenderers - 

The Structure
---


How does it work?
---


Dependencies
---

