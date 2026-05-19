export default {
    "nodes": [
        {
            "id": "start",
            "type": "callStart",
            "position": {
                "x": 119.99999999999994,
                "y": -2.1316282072803006e-14
            },
            "data": {
                "label": "Call Start"
            },
            "width": 156,
            "height": 42,
            "selected": true,
            "positionAbsolute": {
                "x": 119.99999999999994,
                "y": -2.1316282072803006e-14
            },
            "dragging": false
        },
        {
            "id": "end",
            "type": "callEnd",
            "position": {
                "x": 118.66666666666663,
                "y": 265.99999999999994
            },
            "data": {
                "label": "Call End"
            },
            "width": 156,
            "height": 42,
            "selected": false,
            "positionAbsolute": {
                "x": 118.66666666666663,
                "y": 265.99999999999994
            },
            "dragging": false
        },
        {
            "id": "3",
            "type": "ringTo",
            "position": {
                "x": 89.33333333333337,
                "y": 122.66666666666666
            },
            "data": {
                "label": "Ring To",
                "ringFor": "",
                "agent": ""
            },
            "width": 215,
            "height": 62,
            "selected": false,
            "positionAbsolute": {
                "x": 89.33333333333337,
                "y": 122.66666666666666
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
            "type": "custom",
            "animated": false,
            "source": "3",
            "sourceHandle": null,
            "target": "end",
            "targetHandle": "in",
            "id": "e-3-end",
            "data": {}
        }
    ]
}