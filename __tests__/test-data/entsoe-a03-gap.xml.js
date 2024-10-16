module.exports = `
<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3">
  <mRID>67528d12b93146ee8254870e5a2f78ab</mRID>
  <revisionNumber>1</revisionNumber>
  <type>A44</type>
  <sender_MarketParticipant.mRID codingScheme="A01">10X1001A1001A450</sender_MarketParticipant.mRID>
  <sender_MarketParticipant.marketRole.type>A32</sender_MarketParticipant.marketRole.type>
  <receiver_MarketParticipant.mRID codingScheme="A01">10X1001A1001A450</receiver_MarketParticipant.mRID>
  <receiver_MarketParticipant.marketRole.type>A33</receiver_MarketParticipant.marketRole.type>
  <createdDateTime>2024-10-11T06:30:44Z</createdDateTime>
  <period.timeInterval>
    <start>2024-10-08T22:00Z</start>
    <end>2024-10-09T22:00Z</end>
  </period.timeInterval>
      <TimeSeries>
        <mRID>1</mRID>
        <auction.type>A01</auction.type>
        <businessType>A62</businessType>
        <in_Domain.mRID codingScheme="A01">10YFI-1--------U</in_Domain.mRID>
        <out_Domain.mRID codingScheme="A01">10YFI-1--------U</out_Domain.mRID>
        <contract_MarketAgreement.type>A01</contract_MarketAgreement.type>
        <currency_Unit.name>EUR</currency_Unit.name>
        <price_Measure_Unit.name>MWH</price_Measure_Unit.name>
        <curveType>A03</curveType>
            <Period>
              <timeInterval>
                <start>2024-10-08T22:00Z</start>
                <end>2024-10-09T22:00Z</end>
              </timeInterval>
              <resolution>PT60M</resolution>
                  <Point>
                    <position>1</position>
                        <price.amount>0.01</price.amount>
                  </Point>
                  <Point>
                    <position>2</position>
                        <price.amount>0</price.amount>
                  </Point>
                  <Point>
                    <position>5</position>
                        <price.amount>0.01</price.amount>
                  </Point>
                  <Point>
                    <position>6</position>
                        <price.amount>3.37</price.amount>
                  </Point>
                  <Point>
                    <position>7</position>
                        <price.amount>4.87</price.amount>
                  </Point>
                  <Point>
                    <position>8</position>
                        <price.amount>9.85</price.amount>
                  </Point>
                  <Point>
                    <position>9</position>
                        <price.amount>11.18</price.amount>
                  </Point>
                  <Point>
                    <position>10</position>
                        <price.amount>11.4</price.amount>
                  </Point>
                  <Point>
                    <position>11</position>
                        <price.amount>11.22</price.amount>
                  </Point>
                  <Point>
                    <position>12</position>
                        <price.amount>9.38</price.amount>
                  </Point>
                  <Point>
                    <position>13</position>
                        <price.amount>7.96</price.amount>
                  </Point>
                  <Point>
                    <position>14</position>
                        <price.amount>7.22</price.amount>
                  </Point>
                  <Point>
                    <position>15</position>
                        <price.amount>7.56</price.amount>
                  </Point>
                  <Point>
                    <position>16</position>
                        <price.amount>8.09</price.amount>
                  </Point>
                  <Point>
                    <position>17</position>
                        <price.amount>8.91</price.amount>
                  </Point>
                  <Point>
                    <position>18</position>
                        <price.amount>9.45</price.amount>
                  </Point>
                  <Point>
                    <position>19</position>
                        <price.amount>8.71</price.amount>
                  </Point>
                  <Point>
                    <position>20</position>
                        <price.amount>6.52</price.amount>
                  </Point>
                  <Point>
                    <position>21</position>
                        <price.amount>1.51</price.amount>
                  </Point>
                  <Point>
                    <position>22</position>
                        <price.amount>0.01</price.amount>
                  </Point>
                  <Point>
                    <position>23</position>
                        <price.amount>0</price.amount>
                  </Point>
                  <Point>
                    <position>24</position>
                        <price.amount>-0.01</price.amount>
                  </Point>
            </Period>
      </TimeSeries>
</Publication_MarketDocument>
`