import * as d3 from 'd3';

export class D3ChartPlugin {
  constructor() {
    this.width = 600;
    this.height = 400;
    this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
  }

  initChart(container, type, data) {
    const svg = d3.select(container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('border', '1px solid #ccc');

    // 메인 그룹 추가
    const g = svg.append('g');

    // 줌 기능 추가
    const zoom = d3.zoom().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

    svg.call(zoom);

    switch(type) {
      case 'pie':
        this.createPieChart(g, data);
        break;
      case 'bar':
        this.createBarChart(g, data);
        break;
      case 'line':
        this.createLineChart(g, data);
        break;
    }

    // 드래그 기능 추가
    this.addDragBehavior(g);

    return svg.node();
  }

  createPieChart(g, data) {
    const radius = Math.min(this.width, this.height) / 3;
    g.attr('transform', `translate(${this.width/2}, ${this.height/2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // 파이 조각 생성
    const arcs = g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // 파이 조각 그리기
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => color(i))
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.1)');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', 'scale(1)');
      });

    // 레이블 추가
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .text(d => `${d.data.label}: ${d.data.value}%`)
      .style('pointer-events', 'none');
  }

  createBarChart(g, data) {
    const innerWidth = this.width - this.margin.left - this.margin.right;
    const innerHeight = this.height - this.margin.top - this.margin.bottom;

    g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([innerHeight, 0]);

    // 막대 그리기
    g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.value))
      .attr('fill', 'steelblue')
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', 'orange');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', 'steelblue');
      });

    // 축 추가
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    g.append('g')
      .call(d3.axisLeft(y));
  }

  createLineChart(g, data) {
    const innerWidth = this.width - this.margin.left - this.margin.right;
    const innerHeight = this.height - this.margin.top - this.margin.bottom;

    g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([innerHeight, 0]);

    // 라인 생성
    const line = d3.line()
      .x(d => x(d.label) + x.bandwidth() / 2)
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // 라인 그리기
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2)
      .attr('d', line);

    // 포인트 추가
    g.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.label) + x.bandwidth() / 2)
      .attr('cy', d => y(d.value))
      .attr('r', 5)
      .attr('fill', 'steelblue')
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 8)
          .attr('fill', 'orange');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 5)
          .attr('fill', 'steelblue');
      });

    // 축 추가
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    g.append('g')
      .call(d3.axisLeft(y));
  }

  addDragBehavior(g) {
    const drag = d3.drag()
      .on('start', this.dragStarted)
      .on('drag', this.dragged)
      .on('end', this.dragEnded);

    g.call(drag);
  }

  dragStarted(event) {
    d3.select(this).raise().classed('active', true);
  }

  dragged(event, d) {
    const transform = d3.select(this).attr('transform') || '';
    const translate = transform.match(/translate\(([-\d.]+),([-\d.]+)\)/) || [0, 0, 0];
    const x = parseFloat(translate[1]) + event.dx;
    const y = parseFloat(translate[2]) + event.dy;
    d3.select(this).attr('transform', `translate(${x},${y})`);
  }

  dragEnded() {
    d3.select(this).classed('active', false);
  }
} 