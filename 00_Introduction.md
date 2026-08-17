# 00_Introduction

# EduFair Manager PRD - Introduction

## Purpose
EduFair Manager is a QR-based school event management platform designed to record student participation efficiently during school events.

## In Scope
- Event management
- Booth management
- Teacher/Admin roles
- Student QR generation (per event)
- Booth QR generation
- QR scanning
- Kiosk mode
- Participation logging
- Real-time dashboard
- Statistics
- Student stampbook
- Excel/PDF export
- Log system
- System settings

## Out of Scope
- Online student registration
- Parent portal
- Payment features
- Attendance management outside events

## Core Entities
### Event
A school event containing booths, students and participation records.

### Booth
A program operated within an event.

### Student
A participant imported from an Excel file. A new QR is issued for every event.

### Participation
A single scan record linking one student to one booth at one time.

## User Roles
### Administrator
Manages events, booths, teachers, imports students, generates QR codes, exports reports, edits participation records and views all statistics.

### Booth Operator
Operates assigned booths, scans student QR codes, cancels incorrect records and views booth statistics.

### Student
Owns an event QR and can view a digital stampbook.

## System Workflow
1. Create an event.
2. Create or copy booth template.
3. Import students from Excel.
4. Generate student and booth QR codes.
5. Teachers scan student QR codes during the event.
6. Participation records are stored in real time.
7. Dashboards update automatically.
8. Export reports after the event.

## Success Criteria
- Fast QR-based operation with minimal teacher interaction.
- Accurate participation records.
- Real-time statistics.
- Reusable event templates.
- Easy reuse by other schools.

## Version
v1.0 Draft
