import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

function D3PieChart({ onClose, onSave }) {
  const [data, setData] = useState([
    { label: "Category A", value: 30 },
    { label: "Category B", value: 20 },
    { label: "Category C", value: 50 }
  ]);
  const svgRef = useRef();

  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    drawChart();
  }, [data]);

  const drawChart = () => {
    // 기존 차트 제거
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width/2}, ${height/2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie()
      .value(d => d.value);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    // 파이 차트 그리기
    const arcs = svg.selectAll("arc")
      .data(pie(data))
      .enter()
      .append("g");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i))
      .attr("stroke", "white")
      .style("stroke-width", "2px");

    // 레이블 추가
    arcs.append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .text(d => `${d.data.label}: ${d.data.value}%`);
  };

  const handleAddData = () => {
    if (newLabel && newValue) {
      setData([...data, { label: newLabel, value: parseInt(newValue) }]);
      setNewLabel('');
      setNewValue('');
    }
  };

  const handleSave = () => {
    // SVG를 직접 문자열로 변환
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    // SVG 문자열을 직접 전달
    onSave(svgData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium mb-4">Create Pie Chart</h3>
            
            {/* 데이터 입력 폼 */}
            <div className="mb-4 flex space-x-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label"
                className="flex-1 border rounded px-2 py-1"
              />
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value (%)"
                className="w-24 border rounded px-2 py-1"
              />
              <button
                onClick={handleAddData}
                className="px-4 py-1 bg-black text-white rounded hover:bg-gray-800"
              >
                Add
              </button>
            </div>

            {/* 차트 표시 영역 */}
            <div className="flex justify-center">
              <svg ref={svgRef}></svg>
            </div>

            {/* 버튼 */}
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleSave}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-black text-base font-medium text-white hover:bg-gray-800 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
              >
                Insert Chart
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default D3PieChart; 