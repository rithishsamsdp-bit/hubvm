export default {
  "nodes": [
      {
        "id": "start",
        "type": "callStart",
        "position": {
          "x": 224.66666666666669,
          "y": -26.666666666666664
        },
        "data": {
          "label": "Call Start"
        },
        "width": 156,
        "height": 42,
        "selected": false,
        "positionAbsolute": {
          "x": 224.66666666666669,
          "y": -26.666666666666664
        },
        "dragging": false
      },
      {
        "id": "end",
        "type": "callEnd",
        "position": {
          "x": 218.19632957802577,
          "y": 437.6225321868238
        },
        "data": {
          "label": "Call End"
        },
        "width": 156,
        "height": 42,
        "selected": false,
        "positionAbsolute": {
          "x": 218.19632957802577,
          "y": 437.6225321868238
        },
        "dragging": false
      },
      {
        "id": "2",
        "type": "timeRule",
        "position": {
          "x": 194.66666666666663,
          "y": 100.00000000000003
        },
        "data": {
          "label": "Time Rule",
          "branches": [
            {
              "id": 1758196991963,
              "title": "Bussiness Hours",
              "days": [
                1,
                2,
                3,
                4,
                5
              ],
              "timeSlots": [
                {
                  "id": 1758196991964,
                  "from": "09:30",
                  "to": "18:30"
                }
              ],
              "nodeId": "3"
            },
            {
              "id": 1758196993371,
              "title": "Non Bussiness Hours",
              "days": [
                0,
                6
              ],
              "timeSlots": [
                {
                  "id": 1758196993372,
                  "from": "00:00",
                  "to": "23:59"
                }
              ],
              "nodeId": "4"
            }
          ]
        },
        "width": 215,
        "height": 62,
        "selected": false,
        "positionAbsolute": {
          "x": 194.66666666666663,
          "y": 100.00000000000003
        },
        "dragging": false
      },
      {
        "id": "3",
        "type": "timeCase",
        "position": {
          "x": 54.46809919306145,
          "y": 207.76256493281554
        },
        "style": {
          "backgroundColor": "#2A2A2A",
          "color": "var(--color-white)",
          "height": 34,
          "borderRadius": 40,
          "padding": 10,
          "fontFamily": "var(--roboto)",
          "fontSize": "var(--font-sm)",
          "fontWeight": 500
        },
        "data": {
          "label": "Bussiness Hours",
          "fromNodeId": "2"
        },
        "width": 150,
        "height": 34,
        "selected": false,
        "positionAbsolute": {
          "x": 54.46809919306145,
          "y": 207.76256493281554
        },
        "dragging": false
      },
      {
        "id": "4",
        "type": "timeCase",
        "position": {
          "x": 395.4688198419294,
          "y": 208.2025529707308
        },
        "style": {
          "backgroundColor": "#2A2A2A",
          "color": "var(--color-white)",
          "height": 34,
          "borderRadius": 40,
          "padding": 10,
          "fontFamily": "var(--roboto)",
          "fontSize": "var(--font-sm)",
          "fontWeight": 500
        },
        "data": {
          "label": "Non Bussiness Hours",
          "fromNodeId": "2"
        },
        "width": 150,
        "height": 34,
        "selected": false,
        "positionAbsolute": {
          "x": 395.4688198419294,
          "y": 208.2025529707308
        },
        "dragging": false
      },
      {
        "id": "5",
        "type": "ringTo",
        "position": {
          "x": 21.51447156848377,
          "y": 296.2524946337488
        },
        "data": {
          "label": "Ring To"
        },
        "width": 215,
        "height": 62,
        "selected": false,
        "positionAbsolute": {
          "x": 21.51447156848377,
          "y": 296.2524946337488
        },
        "dragging": false
      },
      {
        "id": "6",
        "type": "ringTo",
        "position": {
          "x": 363.93102646495913,
          "y": 299.7346968869333
        },
        "data": {
          "label": "Ring To"
        },
        "width": 215,
        "height": 62,
        "selected": false,
        "positionAbsolute": {
          "x": 363.93102646495913,
          "y": 299.7346968869333
        },
        "dragging": false
      }
    ],
    "edges": [
      {
        "type": "custom",
        "animated": false,
        "source": "start",
        "sourceHandle": "out",
        "target": "2",
        "targetHandle": null,
        "id": "e-start-2",
        "data": {}
      },
      {
        "id": "e-2-3",
        "source": "2",
        "target": "3",
        "type": "custom",
        "data": {}
      },
      {
        "id": "e-2-4",
        "source": "2",
        "target": "4",
        "type": "custom",
        "data": {}
      },
      {
        "type": "custom",
        "animated": false,
        "source": "5",
        "sourceHandle": null,
        "target": "end",
        "targetHandle": "in",
        "id": "e-5-end",
        "data": {}
      },
      {
        "type": "custom",
        "animated": false,
        "source": "6",
        "sourceHandle": null,
        "target": "end",
        "targetHandle": "in",
        "id": "e-6-end",
        "data": {}
      },
      {
        "type": "custom",
        "animated": false,
        "source": "3",
        "sourceHandle": null,
        "target": "5",
        "targetHandle": null,
        "id": "e-3-5",
        "data": {}
      },
      {
        "type": "custom",
        "animated": false,
        "source": "4",
        "sourceHandle": null,
        "target": "6",
        "targetHandle": null,
        "id": "e-4-6",
        "data": {}
      }
    ]
}