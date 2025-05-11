# Feature Plan: Add Custom SVG Lines to Technical Drawing

This document outlines the plan to implement a feature allowing users to draw their own SVG lines on the technical drawing canvas.

## I. User Story

As a user, I want to enter a special "Draw Line" mode where I can perform two clicks on the canvas to place a line. This line should have the same default thickness and color as measurement lines in the PDF export. These custom lines should also be included in the drawing's saved state (e.g., JSON export/import) and be rendered correctly when the state is loaded.

## II. High-Level Plan

1.  **Modify `TechnicalDrawingCanvas.jsx`:**
    *   Introduce a new `interactionMode` value, for example, `'drawLine'`.
    *   Update click handling logic to capture two points when in `'drawLine'` mode.
        *   The first click defines the line's start point.
        *   The second click defines the line's end point and creates the line.
    *   Store these user-drawn lines in a new state variable (e.g., `userDrawnLines`).
    *   Render these `userDrawnLines` as SVG `<line>` elements on the canvas within the appropriate `Viewbox` using a standard visible style for the UI.
    *   Ensure these lines are included in the data for PDF export (styled like measurement lines) and for the drawing state export/import functionality.
2.  **Modify `DrawingControls.jsx`:**
    *   Add a new button labeled "Draw Line Mode" alongside the existing "Measure Mode" / "Snap Mode" toggle.
    *   This button will set the `interactionMode` to `'drawLine'`.
3.  **Data Structure & Styling:**
    *   Define a simple data structure for user-drawn lines (e.g., `{ id, viewInstanceId, startCoords, endCoords }`).
    *   For UI display, use a standard visible style (e.g., black, 1px stroke).
    *   **Crucially, for PDF export, ensure new lines use the same default thickness and color as existing measurement lines.** This will be handled within the `useTechnicalDrawingPdfExport.js` hook.

## III. Visual Plan (Mermaid Diagram)

```mermaid
graph TD
    A[User Clicks "Draw Line Mode" Button] --> B{Set `interactionMode` = 'drawLine'};

    subgraph DrawingControls.jsx
        AA[Add "Draw Line Mode" Button] --> A;
        AB[Update `onInteractionModeChange` to handle 'drawLine'] --> B;
    end

    subgraph TechnicalDrawingCanvas.jsx
        BA[Define 'drawLine' as new `interactionMode` value]

        B --> C{User Clicks on Canvas (1st time in 'drawLine' mode)};
        C --> D[Store 1st Click Coordinates (startPoint)];
        D --> E{User Clicks on Canvas (2nd time in 'drawLine' mode)};
        E --> F[Store 2nd Click Coordinates (endPoint)];
        F --> G[Create Line Object (ID, viewInstanceId, start, end)];
        G --> H[Add Line to `userDrawnLines` state array];
        H --> I[Render `userDrawnLines` as SVG `<line>` elements];

        BI[New state: `userDrawnLines = []`] --> H;
        BJ[Update click handler (e.g., `handleSnapClick` or new `handleDrawLineClick`)] --> C;
        BJ --> E;
        BK[SVG Rendering Logic for `userDrawnLines`] --> I;
    end

    subgraph Export & Persistence
        EA[Update `useTechnicalDrawingPdfExport` hook] --> EB[Include `userDrawnLines` in PDF (styled as measurement lines)];
        EC[Update `exportDrawingState` function] --> ED[Add `userDrawnLines` to JSON state];
        EE[Update `importDrawingState` function] --> EF[Load `userDrawnLines` from JSON state];
    end

    I --> EA;
    I --> EC;

    S[Styling] --> SD[UI: Standard visible style. PDF: Match measurement lines];
    I --> S;
```

## IV. Key Implementation Steps

1.  **In `src/components/technical-drawing/TechnicalDrawingCanvas.jsx`:**
    *   **State:** Add `const [userDrawnLines, setUserDrawnLines] = useState([]);`
    *   **State for First Click:** Add `const [firstLinePoint, setFirstLinePoint] = useState(null);` to temporarily store the first click's data in `'drawLine'` mode.
    *   **Click Handling:**
        *   Modify `handleSnapClick` (or create a new, similar handler like `handleDrawLineClick`) to include logic for `interactionMode === 'drawLine'`.
        *   If `'drawLine'` mode:
            *   On the first click in a view, store its `svgCoords` and `viewInstanceId` in `firstLinePoint`.
            *   On the second click:
                *   If `firstLinePoint` is set and the `viewInstanceId` matches:
                    *   Create a new line object (e.g., `{ id: \`userLine-\${Date.now()}\`, viewInstanceId: firstLinePoint.viewInstanceId, start: firstLinePoint.coordinates, end: currentSvgCoords }`).
                    *   Add this to `userDrawnLines`.
                    *   Reset `firstLinePoint` to `null`.
                *   If `viewInstanceId` doesn't match, or it's the first click in a new sequence, treat it as the new `firstLinePoint`.
    *   **Rendering (UI):**
        *   Inside the `Viewbox` component's mapping (or wherever SVGs are rendered per view), add another loop:
            ```jsx
            {userDrawnLines
              .filter(line => line.viewInstanceId === viewbox.instanceId) // Ensure line is for current viewbox
              .map(line => (
                <line
                  key={line.id}
                  x1={line.start.x}
                  y1={line.start.y}
                  x2={line.end.x}
                  y2={line.end.y}
                  stroke="black" // Standard visible color for UI
                  strokeWidth={1} // Standard visible thickness for UI
                />
            ))}
            ```
    *   **Export/Import:**
        *   Pass `userDrawnLines` to `useTechnicalDrawingPdfExport.js`.
        *   Modify the hook to draw these lines in the PDF, ensuring they use the same styling (thickness, color) as measurement lines.
        *   In `exportDrawingState` (and its counterpart `importDrawingState`), include `userDrawnLines`.

2.  **In `src/components/technical-drawing/DrawingControls.jsx`:**
    *   Add a new button labeled "Draw Line Mode" (or similar) alongside the existing "Measure Mode" / "Snap Mode" button.
    *   This button's `onClick` would call `onInteractionModeChange('drawLine')`.
    *   The button's text and styling should indicate the active "Draw Line Mode". Adjust the logic for the existing mode button's text/styling to accommodate three modes ('measure', 'snap', 'drawLine').

3.  **Line Styling (PDF Focus):**
    *   The primary focus for matching measurement line style (thickness, color) will be within the `useTechnicalDrawingPdfExport.js` hook.
    *   For the UI display in `TechnicalDrawingCanvas.jsx`, a default visible style (e.g., `stroke="black" strokeWidth={1}`) is sufficient.

## V. Clarifications & Considerations

*   **Snapping for User Lines:** For this initial implementation, the two clicks for drawing a line will be free-form (not snapping to existing geometry). Snapping can be considered as a future enhancement.
*   **Editing/Deleting Lines:** This plan covers adding lines. Modifying or deleting them would be a subsequent feature.
*   **Line Color (UI):** Defaulted to "black" for UI. PDF color will match measurement lines.
*   **Mode Persistence:** After drawing one line, the mode will remain "Draw Line Mode" until the user explicitly changes it.