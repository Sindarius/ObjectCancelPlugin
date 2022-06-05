/* eslint-disable */

import * as d3 from 'd3'

export default class {

    constructor(el, clientWidth, clientHeight) {
        this.clientWidth = clientWidth;
        this.clientHeight = clientHeight;
        this.el = el;
        this.margin = { top: 10, right: 30, bottom: 30, left: 30 };
        this.width = clientWidth - this.margin.left - this.margin.right;
        this.height = clientHeight - this.margin.top - this.margin.bottom;

        this.x = d3.scaleLinear()
            .domain([0, 400])
            .range([0, 400]);

        this.y = d3.scaleLinear()
            .domain([0, 400])
            .range([400, 0]);

        this.zoom = d3.zoom()
            .scaleExtent([.5, 5]).on("zoom", (e) => {
                this.zoomArea.attr("transform", e.transform);
                var newX = e.transform.rescaleX(this.x);
                var newY = e.transform.rescaleY(this.y);
                this.xAxisSvg.call(d3.axisBottom(newX));
                this.yAxisSvg.call(d3.axisLeft(newY));
            })

        this.svg = d3.select(this.el)
            .append('svg')
            .attr('width', clientWidth)
            .attr('height', clientHeight)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .call(this.zoom)


        // Add a clipPath: everything out of this area won't be drawn.

        this.clipControl = this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", clientWidth)
            .attr("height", clientHeight)
            .attr("x", 0)
            .attr("y", 0);


        this.clipArea = this.svg.append('g')
            .attr('clip-path', 'url(#clip)')
        this.zoomArea = this.clipArea.append('g')

        this.bedSvg = this.zoomArea.append('g');
        this.xAxisSvg = this.svg.append('g');
        this.yAxisSvg = this.svg.append('g');
        this.buildObjectSvg = this.zoomArea.append('g')

        this.currentBuildObjectIndex = -1;
        this.buildObjects = new Array();
        this.cursorSvg;

        this.mouseOverIdx;
        this.cancelCallback = () => { };

        this.maxy = 0;
    }

    resize(clientWidth, clientHeight) {

        this.clientWidth = clientWidth;
        this.clientHeight = clientHeight;

        this.svg
            .attr('width', clientWidth)
            .attr('height', clientHeight)
    }

    updateViewBox(x, y) {
        this.svg.attr('viewBox', `-30 20 ${x.max - x.min} ${y.max - y.min}`)
    }

    updateBed(el, x, y, stroke, fill, isDelta) {
        d3.select(el[0]).selectAll("*").remove();
        if (isDelta) {
            let c = el.append('circle')
                .attr('cx', this.x((x.max - x.min) / 2))
                .attr('cy', this.y((y.max - y.min) / 2))
                .attr('r', (x.max - x.min) / 2)
        }
        else {
            let r = el.append('rect');
            r.attr('x', this.x(x.min))
                .attr('y', this.y(y.max))
                .attr('width', x.max - x.min)
                .attr('height', y.max - y.min)
        }

        if (stroke)
            el.attr('stroke', stroke)
        if (fill)
            el.attr('fill', fill)
    }

    updateAxes(x, y) {


        this.x = d3.scaleLinear()
            .domain([x.min, x.max])
            .range([0, x.max - x.min]);

        this.y = d3.scaleLinear()
            .domain([y.min, y.max])
            .range([y.max - y.min, 0]);

        this.yAxisSvg.attr('transform', `translate(0, 0)`)
            .attr('class', 'axis')
            .call(d3.axisLeft(this.y));

        this.xAxisSvg.attr('transform', `translate(0, ${this.y(y.min)})`)
            .classed('axis', true)
            .call(d3.axisBottom(this.x));

        this.clipControl
            .attr('width', 30)
            .attr('height', 30)
            .attr('width', x.max - x.min + 30)
            .attr('height', y.max - y.min + 30)

        this.maxy = y.max;
    }

    createTextElement(el, x, y, label) {
        el.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('font-size', '20px')
            .attr('fill', 'white')
            .text(label);
    }

    //TODO: Add Round Bed
    updateBuildVolume(axes, isDelta) {
        let x = axes.filter(axis => axis.letter == 'X')[0];
        let y = axes.filter(axis => axis.letter == 'Y')[0];
        if (x && y) {
            this.updateViewBox(x, y);
            this.updateAxes(x, y);
            this.updateBed(this.bedSvg, x, y, 'white', 'transparent', isDelta);
            this.resetZoom();
        }
    }

    resetZoom() {
        var t = d3.zoomIdentity.translate(0, this.maxy / 4).scale(0.75);
        this.svg.call(this.zoom.transform, t);
        //this.svg.call(this.zoom);
    }

    setCursorPosition(axes) {
    }

    setMouseOverIdx(idx) {
        let that = this;
        this.mouseOverIdx = idx;
        if (idx === -1) {
            this.buildObjectSvg.selectAll('rect')
                .attr('fill', (d, i) => {
                    if (i == that.mouseOverIdx) {
                        return 'Orange'
                    }
                    if (d.cancelled) {
                        return 'Red'
                    }
                    else if (i == that.currentBuildObjectIndex) {
                        return 'Green'
                    }
                    return 'Black'
                })
        }
        else {
            this.buildObjectSvg.selectAll('rect')
                .filter((d, i) => {
                    return i == idx;
                })
                .attr('fill', 'orange')
        }
    }


    renderBuildObjects() {

        let currentIndex = this.currentBuildObjectIndex;
        let that = this;

        let mouseOver = function (e, d) {
            that.mouseOverIdx = d3.select(this).attr('data-index')
            d3.select(this)
                .attr('fill', 'orange')
        }

        let mouseOut = function (e, d) {
            that.mouseOverIdx = -1;
            that.buildObjectSvg.selectAll('rect')
                .attr('fill', (d, i) => {
                    if (i == that.mouseOverIdx) {
                        return 'Orange'
                    }
                    if (d.cancelled) {
                        return 'Red'
                    }
                    else if (i == that.currentBuildObjectIndex) {
                        return 'Green'
                    }
                    return 'Black'
                })
        }

        let mouseClick = function (e, d) {
            that.cancelCallback(d, d3.select(this).attr('data-index'));
        }

        this.buildObjectSvg
            .selectAll('rect')
            .data(this.buildObjects)
            .join(
                function (enter) {
                    return enter.append('rect')
                        .on('mouseover', mouseOver)
                        .on('mouseout', mouseOut)
                        .on('click', mouseClick)
                        .attr('x', (d) => that.x(d.x[0]))
                        .attr('y', (d) => that.y(d.y[1]))
                        .attr('width', (d) => d.x[1] - d.x[0])
                        .attr('height', (d) => d.y[1] - d.y[0])
                        .append('title')
                        .text((d) => d.name)
                },
                function (update) {
                    return update
                        .attr('x', (d) => that.x(d.x[0]))
                        .attr('y', (d) => that.y(d.y[1]))
                        .attr('width', (d) => d.x[1] - d.x[0])
                        .attr('height', (d) => d.y[1] - d.y[0])
                        .attr('data-index', (d, i) => i)
                        .attr('stroke', 'white')
                        .attr('fill', (d, i) => {
                            if (i == that.mouseOverIdx) {
                                return 'Orange'
                            }
                            if (d.cancelled) {
                                return 'Red'
                            }
                            else if (i == currentIndex) {
                                return 'Green'
                            }
                            return 'Black'
                        })

                },
                function (exit) {
                    return exit.remove();
                }
            )

        this.buildObjectSvg
            .selectAll('text')
            .data(this.buildObjects)
            .join(
                function (enter) {
                    return enter.append('text')
                },
                function (update) {

                    return update.attr('x', (d) => that.x(d.x[0] + (d.x[1] - d.x[0]) / 2))
                        .attr('y', (d) => that.y(d.y[0] + (d.y[1] - d.y[0]) / 2))
                        .attr('stroke', 'white')
                        .attr('font-size', '2')
                        .attr('stroke-width', '0.05')
                        .attr('text-anchor', 'middle')
                        .attr('alignment-baseline', 'middle')
                        .attr('class', 'buildobject-svgtxt')
                        .text((d) => d.name)
                },
                function (exit) {
                    return exit.remove();
                }
            )
    }
    updateData(data) {
        if (data.hasOwnProperty('objects')) {
            this.currentBuildObjectIndex = data.currentObject;
            this.buildObjects = data.objects;
        }
        else {
            this.currentBuildObjectIndex = -1;
            this.buildObjects = [];
        }
        this.renderBuildObjects();

    }

}
