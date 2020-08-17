node {
  stage('SCM') {
    checkout(scm)

    checkout(scm: [
        $class: 'GitSCM',
        branches: [ [name: 'feature/EBSIINT-263'] ],
        userRemoteConfigs: [ [url: 'https://ebsi1-robot@ec.europa.eu/cefdigital/code/scm/ebsi/automation.git', credentialsId: 'b257a49a-5fed-4971-a6df-e05d3200edc0'] ],
        extensions: [
            [$class: 'RelativeTargetDirectory', relativeTargetDir: "automation"],
      ],
      poll: false
    ])      
  }
  stage('SmartContract Testing') {
        sh "automation/SmartContractFuncTests.sh"
  }
}
