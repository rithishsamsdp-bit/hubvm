export default {
  "nodes": [
    {
      "id": "start",
      "type": "callStart",
      "position": {
        "x": 132.66666666666663,
        "y": -71.08333333333333
      },
      "data": {
        "label": "Call Start"
      },
      "width": 156,
      "height": 42,
      "selected": true,
      "positionAbsolute": {
        "x": 132.66666666666663,
        "y": -71.08333333333333
      },
      "dragging": false
    },
    {
      "id": "end",
      "type": "callEnd",
      "position": {
        "x": 131.01328315471687,
        "y": 527.1031976103036
      },
      "data": {
        "label": "Call End"
      },
      "width": 156,
      "height": 42,
      "selected": false,
      "positionAbsolute": {
        "x": 131.01328315471687,
        "y": 527.1031976103036
      },
      "dragging": false
    },
    {
      "id": "3",
      "type": "keypad",
      "position": {
        "x": 102.24065611896953,
        "y": 61.57398945230281
      },
      "data": {
        "label": "Keypad (IVR)",
        "buttons": [
          {
            "id": 1755498144947,
            "key": "1",
            "title": "press 1",
            "nodeId": "4"
          },
          {
            "id": 1755498163483,
            "key": "2",
            "title": "press 2",
            "nodeId": "5"
          },
          {
            "id": 1755498170227,
            "key": "3",
            "title": "press 3",
            "nodeId": "6"
          }
        ]
      },
      "width": 215,
      "height": 62,
      "selected": false,
      "positionAbsolute": {
        "x": 102.24065611896953,
        "y": 61.57398945230281
      },
      "dragging": false
    },
    {
      "id": "4",
      "type": "timeCase",
      "position": {
        "x": -134.11552509260582,
        "y": 199.26162866885477
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
        "label": "press 1",
        "fromNodeId": "3"
      },
      "width": 150,
      "height": 34,
      "selected": false,
      "positionAbsolute": {
        "x": -134.11552509260582,
        "y": 199.26162866885477
      },
      "dragging": false
    },
    {
      "id": "5",
      "type": "timeCase",
      "position": {
        "x": 133.6790121572052,
        "y": 202.14735912115847
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
        "label": "press 2",
        "fromNodeId": "3"
      },
      "width": 150,
      "height": 34,
      "selected": false,
      "positionAbsolute": {
        "x": 133.6790121572052,
        "y": 202.14735912115847
      },
      "dragging": false
    },
    {
      "id": "6",
      "type": "timeCase",
      "position": {
        "x": 407.0313425693952,
        "y": 202.8700805100726
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
        "label": "press 3",
        "fromNodeId": "3"
      },
      "width": 150,
      "height": 34,
      "selected": false,
      "positionAbsolute": {
        "x": 407.0313425693952,
        "y": 202.8700805100726
      },
      "dragging": false
    },
    {
      "id": "7",
      "type": "ringTo",
      "position": {
        "x": -165.89522288993075,
        "y": 321.0733439770485
      },
      "data": {
        "label": "Ring To"
      },
      "width": 215,
      "height": 62,
      "selected": false,
      "positionAbsolute": {
        "x": -165.89522288993075,
        "y": 321.0733439770485
      },
      "dragging": false
    },
    {
      "id": "8",
      "type": "ringTo",
      "position": {
        "x": 102.66666666666669,
        "y": 320.94761144496533
      },
      "data": {
        "label": "Ring To"
      },
      "width": 215,
      "height": 62,
      "selected": false,
      "positionAbsolute": {
        "x": 102.66666666666669,
        "y": 320.94761144496533
      },
      "dragging": false
    },
    {
      "id": "10",
      "type": "voicemail",
      "position": {
        "x": 374.66666666666663,
        "y": 320.6666666666667
      },
      "data": {
        "label": "Voicemail"
      },
      "width": 215,
      "height": 62,
      "selected": false,
      "positionAbsolute": {
        "x": 374.66666666666663,
        "y": 320.6666666666667
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
      "target": "3",
      "targetHandle": null,
      "id": "e-start-3",
      "data": {}
    },
    {
      "id": "e-3-4",
      "source": "3",
      "target": "4",
      "type": "custom",
      "data": {}
    },
    {
      "id": "e-3-5",
      "source": "3",
      "target": "5",
      "type": "custom",
      "data": {}
    },
    {
      "id": "e-3-6",
      "source": "3",
      "target": "6",
      "type": "custom",
      "data": {}
    },
    {
      "type": "custom",
      "animated": false,
      "source": "4",
      "sourceHandle": null,
      "target": "7",
      "targetHandle": null,
      "id": "e-4-7",
      "data": {}
    },
    {
      "type": "custom",
      "animated": false,
      "source": "5",
      "sourceHandle": null,
      "target": "8",
      "targetHandle": null,
      "id": "e-5-8",
      "data": {}
    },
    {
      "type": "custom",
      "animated": false,
      "source": "6",
      "sourceHandle": null,
      "target": "10",
      "targetHandle": null,
      "id": "e-6-10",
      "data": {}
    },
    {
      "type": "custom",
      "animated": false,
      "source": "7",
      "sourceHandle": null,
      "target": "end",
      "targetHandle": "in",
      "id": "e-7-end",
      "data": {}
    },
    {
      "type": "custom",
      "animated": false,
      "source": "8",
      "sourceHandle": null,
      "target": "end",
      "targetHandle": "in",
      "id": "e-8-end",
      "data": {}
    },
    {
      "type": "custom",
      "animated": false,
      "source": "10",
      "sourceHandle": null,
      "target": "end",
      "targetHandle": "in",
      "id": "e-10-end",
      "data": {}
    }
  ]
}