# SwiftVote User Roles and Access Overview

## Purpose

This document explains, at a high level, how user accounts and roles should work in SwiftVote.

The goal is simple:

- make sure the right people can do the right things
- protect sensitive event controls from the wrong people
- allow different events to have different teams
- keep management flexible as SwiftVote grows

This is not the technical implementation document. It is the business-level view of what we want to achieve.

## What We Are Solving

SwiftVote is not just a public voting website. It is also an operations platform for managing events, pageantry, nominations, contestants, reports, and moderation.

Because of that, not everyone should have the same level of access.

For example:

- one person may own an event
- another person may help manage contestants
- another person may only need to view analytics
- the platform itself still needs one top-level administrator

We need a structure that supports all of that clearly and safely.

## The Main Idea

Each person should have one account in SwiftVote.

That account can then have:

- a platform-level role
- one or more event-level roles

This gives us flexibility.

It means someone can be:

- a regular team member on one event
- an analyst on another event
- and still not have access to everything across the whole platform

## Default User Position

Every person in SwiftVote starts as a normal user.

That means the platform is not designed around a closed internal staff-only model.

Normal users should be able to:

- create events
- become responsible for the events they create
- later invite or work with other people on those events

This is important because SwiftVote is meant to serve event creators directly, not only platform operators.

## Platform-Level Role

### Super Admin

SwiftVote will have one `Super Admin`.

This is the highest level account on the platform.

The Super Admin is responsible for:

- overall platform control
- creating and managing internal staff users
- stepping into any event when needed
- resolving access problems
- supporting operations across all events

This role should be used carefully and by as few people as possible.

## Event-Level Roles

Each event can have its own team.

This is important because SwiftVote is meant to support multiple events, and each event may have different organizers or staff.

When a normal user creates a new event, that user becomes the first `Event Owner` for that event.

### Event Owner

The Event Owner is the main person in charge of a specific event.

They should be able to:

- control the event setup
- manage the team attached to that event
- manage voting windows
- oversee categories, contestants, and reports

This is the highest role inside a single event.

### Event Admin

The Event Admin helps run the event day to day.

They should be able to:

- manage event operations
- manage categories and contestants
- help control nominations and voting flow
- view reports and activity

They are powerful within the event, but still below the Event Owner.

### Moderator

The Moderator helps keep the event content clean and organized.

They should be able to:

- review or approve contestants
- manage comments or reviews if those are enabled
- help keep the event experience orderly

They should not control the whole event or manage the event team.

### Analyst

The Analyst is a read-focused role.

They should be able to:

- view reports
- monitor performance
- review trends and participation data
- export insights when needed

They should not change important event settings.

## Why We Want Event Roles

Event roles give SwiftVote a more practical operating model.

Without them:

- too many people would need broad admin access
- event control would become messy
- audit and accountability would become weaker

With event roles:

- access stays organized
- responsibility is clear
- the platform becomes easier to manage at scale

## What This Means in Practice

Here are simple examples of how this should work:

### Example 1

A user may be an `Event Owner` for "Campus Choice Awards" but have no access at all to another event.

### Example 2

A user may be an `Analyst` for one event and a `Moderator` for another.

### Example 3

The `Super Admin` can access any event when platform-level support is needed.

## First Phase Scope

For the first phase, we should focus on the user and role model that supports real event creation.

That means:

- normal users who can create events
- Super Admin
- Event Owner
- Event Admin
- Moderator
- Analyst

This first phase is mainly about:

- who can create an event
- who becomes responsible for that event
- how event teams are structured
- how the platform keeps access organized

It is still not yet focused on public voter accounts, contestant self-service accounts, or advanced customer-facing login flows.

## What Success Looks Like

We will know this structure is working when:

- normal users can create events
- event creators automatically become event owners
- the platform has one clear top-level administrator
- each event can have its own team
- people only see and manage what they are supposed to
- access can be changed without affecting the whole platform
- the system remains clear as more events are added

## Summary

SwiftVote needs a role and access system that reflects how real events are run.

At a high level, we want:

- normal users who can create events
- one platform-level Super Admin
- event-specific roles for managing individual events
- clear boundaries between oversight, operations, moderation, and reporting

This gives SwiftVote a strong operational foundation before we move into the deeper technical implementation.
